import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createHash,sign} from 'node:crypto';
import {resolve,basename} from 'node:path';
import {validateRelease,type ReleaseManifest} from '../src/shared/releases';
const [manifestPath,keyPath,artifactDirectory,outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('Usage: tsx scripts/sign-release.ts manifest.json private-key.pem artifact-directory signed-release.json');
const manifest=validateRelease(JSON.parse(readFileSync(manifestPath,'utf8')));
for(const asset of manifest.assets){const file=resolve(artifactDirectory,basename(new URL(asset.url).pathname));const hash=createHash('sha256');let size=0;for await(const chunk of createReadStream(file)){hash.update(chunk);size+=chunk.length;}if(hash.digest('hex')!==asset.sha256||size!==asset.size)throw Error('Release asset differs from manifest: '+file);}
const payload=JSON.stringify(manifest satisfies ReleaseManifest),signature=sign(null,Buffer.from(payload),readFileSync(keyPath)).toString('base64');
writeFileSync(outputPath,JSON.stringify({payload,signature},null,2));console.log('Signed locally. No files were uploaded.');
