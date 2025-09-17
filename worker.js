// dynamic loads to ensure build-phase context

// Expose Durable Object bindings
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

const worker = {
  async fetch(request, env, ctx) {
    const { default: originalWorker } = await import('./.open-next/worker.js');
    const { runWithCloudflareRequestContext } = await import('./.open-next/cloudflare/init.js');
    return runWithCloudflareRequestContext(request, env, ctx, () => originalWorker.fetch(request, env, ctx));
  },
};

export default worker;
