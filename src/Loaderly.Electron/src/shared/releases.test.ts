import {describe,it,expect} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {newerVersion,validateRelease} from './releases';
import {verifiedManifest} from '../main/programUpdates';
const release=()=>({schema:1,version:'2.1.1',notes:'New release',publishedAt:'2026-10-10T12:00:00Z',assets:[{platform:'win32',arch:'x64',format:'exe',url:'https://github.com/voidksa/Loaderly/releases/download/v2.1.1/Loaderly-Setup-2.1.1.exe',size:100,sha256:'a'.repeat(64)}]});
describe('stable program updates',()=>{
 it('compares numeric versions and excludes preview releases and downgrades',()=>{expect(newerVersion('2.10.0','2.9.0')).toBe(true);expect(newerVersion('2.1.0','2.1.0')).toBe(false);expect(newerVersion('2.0.9','2.1.0')).toBe(false);expect(newerVersion('3.0.0-preview.1','2.1.0')).toBe(false);});
 it('rejects URLs outside this version and repository, invalid size and duplicate targets',()=>{for(const url of ['https://evil.test/Loaderly.exe','https://github.com/evil/Loaderly/releases/download/v2.1.1/x.exe','https://github.com/voidksa/Loaderly/releases/download/v2.0.0/x.exe']){const r=release();r.assets[0].url=url;expect(()=>validateRelease(r)).toThrow();}const r=release();r.assets.push(r.assets[0]);expect(()=>validateRelease(r)).toThrow();});
 it('rejects unsigned and altered update metadata',()=>{const {publicKey,privateKey}=generateKeyPairSync('ed25519'),key=publicKey.export({type:'spki',format:'pem'}).toString(),payload=JSON.stringify(release()),signature=sign(null,Buffer.from(payload),privateKey).toString('base64');expect(verifiedManifest({payload,signature},key).version).toBe('2.1.1');expect(()=>verifiedManifest({payload:payload.replace('100','200'),signature},key)).toThrow();expect(()=>verifiedManifest({payload,signature:''},key)).toThrow();});
});
