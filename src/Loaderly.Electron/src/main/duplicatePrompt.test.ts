import {describe,it,expect} from 'vitest';
import {DuplicatePrompts} from './duplicatePrompt';
import {youtubeThumbnailUrl} from '../shared/download-url/mediaIdentity';
describe('duplicate download decisions',()=>{
  it('only accepts a valid choice from the requesting renderer once',async()=>{const prompts=new DuplicatePrompts();let id='';const pending=prompts.request(7,{title:'Song',path:'/media/song.mp3',source:'https://youtu.be/IiBWzcJ0puk'},value=>{id=value.id;});expect(prompts.reply(8,id,'replace')).toBe(false);expect(prompts.reply(7,id,'erase')).toBe(false);expect(prompts.reply(7,id,'keep')).toBe(true);expect(await pending).toBe('keep');expect(prompts.reply(7,id,'replace')).toBe(false);});
  it('skips without touching existing files when the renderer closes or sending fails',async()=>{const prompts=new DuplicatePrompts();const details={title:'Song',path:'/song.mp3',source:'x'};const pending=prompts.request(7,details,()=>{});prompts.cancel(7);expect(await pending).toBe('skip');expect(await prompts.request(7,details,()=>{throw Error();})).toBe('skip');});
  it('only creates artwork URLs for valid YouTube video links',()=>{expect(youtubeThumbnailUrl('https://youtu.be/IiBWzcJ0puk')).toBe('https://i.ytimg.com/vi/IiBWzcJ0puk/default.jpg');expect(youtubeThumbnailUrl('https://www.youtube.com/watch?v=IiBWzcJ0puk')).toContain('/IiBWzcJ0puk/');expect(youtubeThumbnailUrl('https://youtube.com.evil.test/watch?v=IiBWzcJ0puk')).toBeUndefined();expect(youtubeThumbnailUrl('javascript:alert(1)')).toBeUndefined();});
});
