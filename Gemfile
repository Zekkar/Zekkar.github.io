source "https://rubygems.org"

# Jekyll 版本
gem "jekyll", "~> 4.3"

# Chirpy 主題
gem "jekyll-theme-chirpy", "~> 7.2"

# Jekyll 插件
group :jekyll_plugins do
  gem "jekyll-paginate"
  gem "jekyll-redirect-from"
  gem "jekyll-seo-tag"
  gem "jekyll-archives"
  gem "jekyll-sitemap"
  gem "jekyll-include-cache"
end

# Windows 和 JRuby 沒有 zoneinfo 檔案，需要 tzinfo-data gem
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Windows 上的效能提升
gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]

# JRuby 上鎖定 http_parser.rb 版本
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

# 其他必要的依賴
gem "webrick", "~> 1.8"
