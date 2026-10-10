import { json, readContent } from '../server/cms.js';
// Short CDN cache keeps storage reads low; saved changes appear on the site within a minute.
export async function GET(){try{return json((await readContent()).content,200,{'Cache-Control':'public, max-age=0, s-maxage=60, stale-while-revalidate=600'});}catch{return json({message:'Obsah nyní není dostupný.'},503);}}
