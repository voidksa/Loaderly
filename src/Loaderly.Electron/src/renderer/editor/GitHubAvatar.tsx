import {useState} from 'react';

export function GitHubAvatar({login}:{login:string}) {
  const [failedLogin,setFailedLogin]=useState('');
  const valid=/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login);
  return <span className="github-avatar" aria-hidden="true">{valid&&failedLogin!==login
    ?<img src={`https://avatars.githubusercontent.com/${encodeURIComponent(login)}?s=64`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailedLogin(login)}/>
    :login.slice(0,1).toUpperCase()}</span>;
}
