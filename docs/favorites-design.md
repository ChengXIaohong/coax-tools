# 收藏夹功能设计方案

> by 小谋 🦐 | 2026-03-27

---

## 一、交互设计

### 1. 入口位置
在首页顶部搜索框**右侧**增加一个「⭐ 收藏」按钮，带收藏数量角标：

```
[  🔍 搜索工具... [/]  ]        [ ⭐ 3 ]
```

点击后：
- **筛选模式**：只显示已收藏的工具卡片
- 按钮高亮态（填充星形 ⭐），提示当前在浏览收藏
- 再次点击取消筛选，恢复全量显示

### 2. 工具卡片上的收藏操作
每个 `tool-card` 右上角增加星标：

```
┌─────────────────────┐
│  🖼️                 │  ← 图标区
│  压图                │
│  在线压缩图片...      │
│                      │  ☆ ← 收藏按钮（右上角悬浮）
└─────────────────────┘
```

**交互细节：**
- **hover 卡片**：星标淡入显示，提示"收藏"
- **点击星标**：收藏 / 取消收藏，带旋转动画
- **已收藏状态**：星标实心 ⭐，hover 提示"取消收藏"
- 收藏动效：轻微弹跳 + 颜色变为金色
- 取消收藏动效：缩小 + 淡出
- **最小干扰**：不改变现有卡片的尺寸和布局

### 3. 取消收藏的多种方式
- 在首页卡片上点击星标
- 在收藏筛选视图里，每个卡片有移除按钮
- （可选）长按卡片弹出菜单

### 4. 空状态
收藏夹为空时，显示友好提示：

```
┌──────────────────────────────┐
│                              │
│         ⭐                   │
│                              │
│    还没有收藏任何工具          │
│    点击工具卡片的星标收藏吧~   │
│                              │
└──────────────────────────────┘
```

---

## 二、数据存储方案

### localStorage 结构

```json
{
  "coax_favorites": {
    "version": 1,
    "items": [
      { "toolId": 1, "addedAt": "2026-03-27T10:00:00.000Z" },
      { "toolId": 4, "addedAt": "2026-03-27T11:30:00.000Z" }
    ]
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | number | 数据结构版本，便于后续升级 |
| `items` | array | 收藏列表 |
| `items[].toolId` | number | 对应 `tools` 数组中的 `id` |
| `items[].addedAt` | string | ISO 时间戳，记录收藏时间 |

### 为什么要这样设计
- **轻量**：只存 `toolId`，不重复存储工具元数据（title、link 等从 `tools` 数组读取）
- **可扩展**：`addedAt` 方便后续做"按时间排序"或"最近收藏"功能
- **版本号**：数据结构变化时可以平滑迁移

### 核心操作函数

```javascript
// ============ favorites.js ============

const FAVORITES_KEY = 'coax_favorites';
const FAVORITES_VERSION = 1;

// 读取收藏列表
function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.version !== FAVORITES_VERSION) {
      // 版本不匹配时可做迁移
      return migrateFavorites(data);
    }
    return data.items || [];
  } catch {
    return [];
  }
}

// 写入收藏列表
function saveFavorites(items) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify({
    version: FAVORITES_VERSION,
    items
  }));
}

// 添加收藏
function addFavorite(toolId) {
  const items = getFavorites();
  if (items.some(i => i.toolId === toolId)) return; // 已收藏
  items.push({ toolId, addedAt: new Date().toISOString() });
  saveFavorites(items);
  renderFavoritesButton(); // 更新角标数字
}

// 移除收藏
function removeFavorite(toolId) {
  const items = getFavorites().filter(i => i.toolId !== toolId);
  saveFavorites(items);
  renderFavoritesButton();
  // 如果当前在收藏筛选模式，刷新视图
  if (isFavoritesFilterActive()) {
    applyFavoritesFilter();
  }
}

// 切换收藏状态
function toggleFavorite(toolId) {
  const items = getFavorites();
  if (items.some(i => i.toolId === toolId)) {
    removeFavorite(toolId);
  } else {
    addFavorite(toolId);
  }
}

// 判断是否已收藏
function isFavorited(toolId) {
  return getFavorites().some(i => i.toolId === toolId);
}

// 获取收藏数量
function getFavoritesCount() {
  return getFavorites().length;
}
```

---

## 三、UI 布局建议

### 1. 首页 (`index.html`) 改动

```
┌─────────────────────────────────────────────┐
│ [header: 标题 + 主题切换]                     │
├─────────────────────────────────────────────┤
│                                             │
│  [ 🔍 搜索工具...      ]    [ ⭐ 3 收藏 ]     │  ← 收藏入口
│                                             │
│  ── 常用工具 ─────────────────────           │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │压图│ │密码│ │换算│ │JSON│   ...         │
│  └────┘ └────┘ └────┘ └────┘               │
│                                             │
│  ── 文本处理 ─────────────────────           │
│  ...                                        │
│                                             │
└─────────────────────────────────────────────┘
```

**改动点：**
1. 搜索框右侧增加收藏按钮 `[ ⭐ N ]`，N 为收藏数量
2. 每个 `.tool-card` 右上角加星标（CSS absolute 定位，不影响现有布局）
3. 收藏筛选时：顶部显示「⭐ 我的收藏 (3)」提示条，点击可清除筛选
4. 收藏卡片额外显示「已收藏 ✓」角标

### 2. 收藏星标的样式

```css
/* 星标按钮 */
.card-favorite-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  color: #ccc;          /* 未收藏：灰色轮廓星 */
  opacity: 0;           /* 默认隐藏 */
  transition: opacity 0.2s, transform 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

/* hover 卡片时显示星标 */
.tool-card:hover .card-favorite-btn {
  opacity: 1;
}

/* 已收藏状态 */
.card-favorite-btn.favorited {
  color: #f5a623;        /* 金色 */
  opacity: 1;
}

.card-favorite-btn.favorited::before {
  content: '★';          /* 实心星 */
}

/* 未收藏状态 */
.card-favorite-btn::before {
  content: '☆';          /* 空心星 */
}

/* 点击动画 */
.card-favorite-btn:active {
  transform: scale(0.85);
}

.card-favorite-btn.just-favorited {
  animation: favoritePop 0.4s ease;
}

@keyframes favoritePop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.4); }
  100% { transform: scale(1); }
}
```

### 3. 收藏入口按钮

```css
/* 收藏入口按钮 */
.favorites-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  margin-left: 10px;
}

.favorites-nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.favorites-nav-btn.active {
  background: rgba(245, 166, 35, 0.2);
  border-color: #f5a623;
  color: #f5a623;
}

/* 收藏数量角标 */
.favorites-nav-btn .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #f5a623;
  color: white;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
}

.favorites-nav-btn.active .badge {
  background: #d4880f;
}
```

### 4. 收藏筛选视图

当用户点击收藏按钮时，在工具网格上方插入提示条：

```html
<!-- 收藏筛选提示条 -->
<div class="favorites-filter-bar" id="favoritesFilterBar">
  <span class="filter-icon">⭐</span>
  <span class="filter-text">我的收藏 (<span id="favoritesCount">3</span>)</span>
  <button class="filter-clear-btn" onclick="clearFavoritesFilter()">✕ 清除</button>
</div>
```

```css
.favorites-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin-bottom: 20px;
  background: rgba(245, 166, 35, 0.1);
  border: 1px solid rgba(245, 166, 35, 0.3);
  border-radius: 8px;
  animation: slideIn 0.2s ease;
}

.filter-clear-btn {
  margin-left: auto;
  padding: 4px 10px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.filter-clear-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}
```

---

## 四、页面级改动清单

### `index.html`
- 收藏按钮加入 header/search 区域
- 每个 tool-card 模板加星标按钮

### `js/main.js`
- 引入 `js/favorites.js`
- `renderTools()` 时给每张卡片注入收藏状态和点击事件
- 新增 `applyFavoritesFilter()` / `clearFavoritesFilter()`
- 初始化时调用 `renderFavoritesButton()`

### `js/favorites.js`（新建）
- 收藏 CRUD + localStorage 读写

### `css/favorites.css`（新建）
- 所有收藏相关样式

---

## 五、扩展方向（可选）

1. **按分类显示收藏**：收藏的工具按原有分类重新分组展示
2. **拖拽排序**：用户可自定义收藏夹内工具的顺序（存 order 字段）
3. **收藏备注**：用户给收藏的工具加一个简短备注
4. **全站导航栏**：在每个子工具页面也能看到和操作收藏

---

> 🦐 **小谋说**：这个方案对现有代码侵入最小，星标用 absolute 定位不会撑大卡片，收藏状态完全靠 toolId 驱动，刷新不丢，而且 localStorage 结构预留了版本号字段方便以后扩展~
