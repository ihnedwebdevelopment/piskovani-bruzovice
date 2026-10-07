import { json, readContent } from '../server/cms.js';
export async function GET(){try{return json((await readContent()).content);}catch{return json({message:'Obsah nyní není dostupný.'},503);}}
