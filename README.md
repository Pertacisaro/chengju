朋友要用的话，发给他们这几步：

# 1. 克隆下来
git clone https://github.com/Pertacisaro/chengju.git
cd chengju

# 2. 复制配置文件，填入自己的 DeepSeek API Key
cp .env.example .env
# 用任意编辑器打开 .env，把 sk-your-deepseek-api-key-here 换成自己的 key

# 3. 启动
node server.js
# 浏览器打开 http://localhost:5180
