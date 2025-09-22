import { Octokit } from '@octokit/rest'

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// GitHub 저장소 생성 및 코드 업로드 함수
export async function createAndUploadRepository(repoName, description = '') {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // 현재 사용자 정보 가져오기
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`GitHub 사용자: ${user.login}`);
    
    // 저장소 생성
    console.log(`저장소 생성 중: ${repoName}`);
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: description,
      private: false, // 공개 저장소로 설정
      auto_init: false
    });
    
    console.log(`저장소 생성 완료: ${repo.html_url}`);
    return {
      success: true,
      repoUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      owner: user.login,
      repoName: repoName
    };
    
  } catch (error) {
    console.error('GitHub 저장소 생성 실패:', error);
    
    if (error.status === 422 && error.response?.data?.errors?.[0]?.message?.includes('already exists')) {
      return {
        success: false,
        error: '동일한 이름의 저장소가 이미 존재합니다.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'GitHub 저장소 생성에 실패했습니다.'
    };
  }
}