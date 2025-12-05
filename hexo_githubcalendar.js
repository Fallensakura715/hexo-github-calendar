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
