import type Mux from '@mux/mux-node'
import type { CollectionAfterReadHook } from 'payload'
import { getAssetMetadata } from '../lib/getAssetMetadata'

const getAfterReadMuxVideoHook = (mux: Mux, collection: string): CollectionAfterReadHook => {
  return async ({ req, doc, context }) => {
    const hasPlaybackOptions = Array.isArray(doc?.playbackOptions) && doc.playbackOptions.length > 0

    if ((context as any)?.skipMuxVideoAfterReadSync || !doc?.assetId || hasPlaybackOptions) {
      return doc
    }

    try {
      const asset = await mux.video.assets.retrieve(doc.assetId)

      if (asset.status !== 'ready') {
        return doc
      }

      const metadata = getAssetMetadata(asset)

      await req.payload.update({
        collection,
        id: doc.id,
        data: metadata,
        overrideAccess: true,
        context: {
          skipMuxVideoAfterReadSync: true,
        },
      })

      return {
        ...doc,
        ...metadata,
      }
    } catch (err) {
      req.payload.logger.error(
        `[payload-mux] There was an error while syncing metadata for asset ${doc.assetId}:`,
      )
      req.payload.logger.error(err)
      return doc
    }
  }
}

export default getAfterReadMuxVideoHook
