# Render 部署说明

这套站点已经整理成可部署到 Render 的正式版本，部署后会得到一个固定不变的 `onrender.com` 网址。

## 1. 准备代码仓库

1. 把当前项目上传到一个 GitHub 仓库
2. 确保仓库里包含以下关键文件：
   - `render.yaml`
   - `server.py`
   - `index.html`
   - `admin.html`
   - `assets/`

## 2. 在 Render 中创建服务

1. 登录 Render
2. 选择 `New +`
3. 选择 `Blueprint`
4. 连接你的 GitHub 仓库
5. Render 会自动识别仓库里的 `render.yaml`
6. 确认创建服务

## 3. 部署完成后你会得到什么

- 一个固定报名页网址：
  - `https://你的服务名.onrender.com/`
- 一个固定管理页网址：
  - `https://你的服务名.onrender.com/admin.html`
- 管理页默认账号：
  - `admin`
- 管理密码：
  - Render 自动生成在环境变量 `ADMIN_PASSWORD` 中

## 4. 查看管理密码

1. 打开 Render 控制台
2. 进入你的 Web Service
3. 打开 `Environment`
4. 查看 `ADMIN_PASSWORD`

以后你打开管理页时，浏览器会要求输入账号和密码。

## 5. 数据保存位置

当前使用 SQLite，并通过 Render 的持久化磁盘保存：

- 数据目录：`/var/data`
- 数据库文件：`/var/data/signups.db`

这意味着重新部署不会丢失报名数据。

## 6. 绑定正式域名

如果你有自己的域名：

1. 打开 Render 服务
2. 进入 `Settings`
3. 打开 `Custom Domains`
4. 添加你的域名

这样就能把 `onrender.com` 地址换成你自己的正式域名。

## 7. 当前管理策略

- 报名页公开给所有人访问
- 管理页需要账号密码
- 管理接口和 CSV 导出也同样需要账号密码
