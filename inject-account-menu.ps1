$siteRoot = Join-Path $PSScriptRoot '01-website-mirror\site'
$files = Get-ChildItem -Path $siteRoot -Recurse -File -Filter *.html
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file.FullName)
  $relative = $file.FullName.Substring($siteRoot.Length).TrimStart('\')
  if ($relative -like 'en\servicios\*') {
    $prefix = '../../assets/'
  }
  elseif ($relative -like 'en\*') {
    $prefix = '../assets/'
  }
  elseif ($relative -like 'servicios\*') {
    $prefix = '../assets/'
  }
  elseif ($relative -like 'panelweb\*') {
    $prefix = '../assets/'
  }
  else {
    $prefix = 'assets/'
  }

  $cssLine = '  <link rel="stylesheet" href="' + $prefix + 'account-menu.css" />'
  $jsLine = '  <script defer src="' + $prefix + 'account-menu.js"></script>'

  if ($content -match '-menu\.css' -or $content -match '-menu\.js') {
    $content = $content.Replace('  <link rel="stylesheet" href="-menu.css" />', $cssLine)
    $content = $content.Replace('  <script defer src="-menu.js"></script>', $jsLine)
  }

  if ($content -match 'account-menu\.css') {
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
    continue
  }

  $injection = '  <link rel="stylesheet" href="' + $prefix + 'account-menu.css" />' + "`r`n" + '  <script defer src="' + $prefix + 'account-menu.js"></script>' + "`r`n"
  $updated = $content.Replace('</head>', $injection + '</head>')
  [System.IO.File]::WriteAllText($file.FullName, $updated, $utf8NoBom)
}

Write-Output ('Updated ' + $files.Count + ' HTML files')
