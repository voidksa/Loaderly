import {useState} from 'react';
import {FileVideo} from 'lucide-react';
export type MediaIdentityItem={title:string;source?:string;thumbnailUrl?:string};
export function MediaIdentity({item}:{item:MediaIdentityItem}) {
  const [failed,setFailed]=useState(false);
  return <div className="dialog-media"><span className="dialog-media-artwork">{item.thumbnailUrl&&!failed?<img src={item.thumbnailUrl} alt="" draggable={false} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<FileVideo size={21}/>}</span><div><strong dir="auto">{item.title}</strong>{item.source&&<small dir="auto">{item.source}</small>}</div></div>;
}
