## Commit Message 撰寫指引

請 Copilot 在撰寫 commit message 時，務必遵守以下規範：

1. Commit message 必須具體、有主詞、有動詞，明確描述本次程式碼做了什麼樣的變更。
2. 請避免使用「update」、「fix」、「change」等廣泛或空泛的字詞作為唯一內容。
3. 請說明本次 commit 影響了哪些功能、檔案或邏輯，並簡要描述原因或目的。
4. 範例：
    - 新增 FAQ 區塊於首頁
    - 修正表單送出時的驗證邏輯
    - 調整 Nav 元件樣式以改善響應式顯示
    - 移除未使用的 Plans 元件

請勿僅寫「update code」、「fix bug」等無意義描述。請確保每次 commit message 都能讓其他開發者一目了然本次變更內容。

5. Commit message 第一行請以 fix, feat, docs, refactor 等類型作為開頭，如果都是針對某一個功能或頁面進行編輯，可以加上括號來補充檔名、 component name 或頁面名，內文則以英文撰寫。
6. 格式範例：
    - feat(Intro): add background image and animations to intro section
    - fix(Form): correct validation logic for email input
    - docs(Readme): update installation instructions for clarity
    - refactor(Nav): improve responsive design and code structure
