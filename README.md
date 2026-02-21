# Gitick - Minimalist Git-Style Task Manager

Gitick is a privacy-first, minimalist todo app inspired by developer workflows (Git) and TickTick. It features smart text parsing, a focus timer, and a contribution graph to visualize your productivity.

![Gitick App](https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2705.png)

## 📱 How to Install (Add to Home Screen)

Gitick is a **Progressive Web App (PWA)**. You can install it on your device without an app store to get a full-screen, native app experience.

### 🍎 iOS (iPhone / iPad)
1. Open the website in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up) at the bottom of the screen.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right corner.

### 🤖 Android (Chrome)
1. Open the website in **Chrome**.
2. Tap the **Menu** button (three vertical dots ⋮) in the top right corner.
3. Tap **"Install App"** or **"Add to Home Screen"**.
4. Follow the prompt to install.

### 💻 Desktop (Chrome / Edge)
1. Look at the right side of the browser address bar.
2. Click the **Install icon** (a computer screen with a downward arrow).
3. Click **Install**.
4. The app will launch in its own standalone window and can be pinned to your dock/taskbar.

---

## ✨ Key Features

- **Smart Parsing**: Type `!high`, `#work`, or `today` to automatically set priority, tags, and due dates.
- **Focus Mode**: Built-in Pomodoro timer to help you stay in the flow.
- **Git-Style History**: Visualize your completed tasks with a "Contribution Graph" heatmap.
- **Staging Area**: Review task details, add subtasks, and "commit" (complete) them.
- **Privacy First**: All data is stored locally in your browser (`localStorage`). No servers, no tracking.

---

## 🛠️ Development

To run this project locally on your machine:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📲 第一轮 App 化（电脑 + 手机）

当前项目已接入 `Capacitor`，并启用 PWA Service Worker：

1. **准备 Web 资源并同步到原生工程**
   ```bash
   npm run app:prepare
   ```

2. **打开 Android 工程**
   ```bash
   npm run app:android
   ```

3. **打开 iOS 工程（仅 macOS + Xcode）**
   ```bash
   npm run app:ios
   ```

说明：
- 电脑端可直接通过浏览器安装为桌面应用（PWA）。
- 手机端可先用浏览器安装（PWA），或通过 Capacitor 工程打包为原生 App。
- 每次你改完前端代码后，执行一次 `npm run app:prepare` 再去原生工程运行。

## 📝 License

MIT
