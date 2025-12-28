source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
gem "jekyll-include-cache", group: :jekyll_plugins
gem "jekyll-remote-theme"
gem "faraday-retry"

# Windows 和 JRuby 沒有 zoneinfo 檔案，需要 tzinfo-data gem
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Windows 上的效能提升
gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]

# JRuby 上鎖定 http_parser.rb 版本
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]
