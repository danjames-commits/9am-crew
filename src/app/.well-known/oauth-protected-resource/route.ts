import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';

export const GET = protectedResourceHandler({
  authServerUrls: [process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1'],
  resourceUrl: 'https://9amcrew.ca/api/mcp',
});
export const OPTIONS = metadataCorsOptionsRequestHandler();
