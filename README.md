# hexo-github-calendar

## Fixes

修复了窗口缩放比例大于 100% 时`canvas`渲染的问题。

修正了鼠标坐标计算逻辑。

## Enhancements
让界面更像Github: 
- 圆角方形描边渲染
- 五图例
- 更改了contributions和颜色对应关系
- 月份动态显示
- 鼠标悬停动态显示
- 修改移动端响应式布局逻辑

### 教程：
链接：https://zfe.space/post/hexo-githubcalendar.html

### 一键部署：

```
npm i hexo-githubcalendar --save
```

### 网站根目录_config配置项(不是主题的)：
例如butterfly配置为
```yml
# Ice Kano Plus_in
# Hexo Github Canlendar
# Author: Ice Kano
# Modify: Lete乐特

# butterfly
githubcalendar:
  enable: true
  priority: 3
  enable_page: /
  user: zfour
  layout:
    type: id
    name: recent-posts
    index: 0
  githubcalendar_html: '<div class="recent-post-item" style="width:100%;height:auto;padding:10px;"><div id="github_loading" style="width:10%;height:100%;margin:0 auto;display: block"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  viewBox="0 0 50 50" style="enable-background:new 0 0 50 50" xml:space="preserve"><path fill="#d0d0d0" d="M25.251,6.461c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615V6.461z" transform="rotate(275.098 25 25)"><animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.6s" repeatCount="indefinite"></animateTransform></path></svg></div><div id="github_container"></div></div>'
  pc_minheight: 280px
  mobile_minheight: 0px
  color: "['#ebedf0', '#fdcdec', '#fc9bd9', '#fa6ac5', '#f838b2', '#f5089f', '#c4067e', '#92055e', '#540336', '#48022f', '#30021f']"
  api: https://python-github-calendar-api.vercel.app/api
  # api: https://python-gitee-calendar-api.vercel.app/api
  calendar_js: https://cdn.jsdelivr.net/gh/Zfour/hexo-github-calendar@1.21/hexo_githubcalendar.js
  plus_style: ""
```
更多主题配置请参考issuse页：https://github.com/Zfour/hexo-github-calendar/issues


### 执行：

```
hexo clean & hexo g & hexo s
```

### 效果：

<img width="1545" height="567" alt="image" src="https://github.com/user-attachments/assets/5828f2f1-9470-4450-9aa6-940d1810e2eb" />


## 自建API

把这个代码放到cloudflare workers上部署
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const username = url.searchParams.get('user') || url.searchParams.get('username')
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  if (!username) {
    return new Response(JSON.stringify({ 
      error: '缺少 user 参数',
      usage: '/?user=github用户名'
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    })
  }
  
  try {
    const data = await getdata(username)
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders 
      }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '获取数据失败',
      message: error.message,
      total: 0,
      contributions: []
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    })
  }
}

function listSplit(items, n) {
  const result = []
  for (let i = 0; i < items.length; i += n) {
    result.push(items.slice(i, i + n))
  }
  return result
}

async function getdata(name) {
  const headers = {
    'Referer': `https://github.com/${name}`,
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Microsoft Edge";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'X-Requested-With': 'XMLHttpRequest'
  }
  
  const githubUrl = `https://github.com/${name}?action=show&controller=profiles&tab=contributions&user_id=${name}`
  const response = await fetch(githubUrl, { headers })
  
  if (!response.ok) {
    throw new Error('用户不存在或无法访问')
  }
  
  const html = await response.text()
  
  const datadateRegex = /data-date="(.*?)" id="contribution-day-component/g
  const datacountRegex = /<tool-tip .*?class="sr-only position-absolute">(.*?) contribution/g

  const datadate = []
  let match
  while ((match = datadateRegex.exec(html)) !== null) {
    datadate.push(match[1])
  }

  const datacount = []
  while ((match = datacountRegex.exec(html)) !== null) {
    const count = match[1] === 'No' ? 0 : parseInt(match[1])
    datacount.push(count)
  }
  
  if (datadate.length === 0 || datacount.length === 0) {
    return {
      total: 0,
      contributions: []
    }
  }
  
  const combined = datadate.map((date, index) => ({
    date,
    count: datacount[index]
  }))
  combined.sort((a, b) => a.date.localeCompare(b.date))
  
  const contributions = combined.reduce((sum, item) => sum + item.count, 0)
  
  const datalist = combined.map(item => ({
    date: item.date,
    count: item.count
  }))
  
  const datalistsplit = listSplit(datalist, 7)
  
  return {
    total: contributions,
    contributions: datalistsplit
  }
}
```




