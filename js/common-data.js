// 公共数据文件 - 已拆分为更小的模块
// 请直接使用 unit-data.js 和 id-data.js 中的特定数据模块

console.warn('common-data.js 已被拆分为更小的模块:');
console.warn('- unit-data.js 包含单位换算数据');
console.warn('- id-data.js 包含身份证生成器数据');
console.warn('请根据需要引入对应的模块，以减少不必要的资源加载。');

// 为了向后兼容，仍然提供 CommonData 对象
// 但在新代码中建议直接使用 UnitData 和 IdData

// 单位换算数据
const units = {};

// 身份证信息生成器数据
const surnames = [];
const givenNames = [];
const areaCodes = {};
const addressDetails = [];

// 导出所有数据
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = {
        units,
        surnames,
        givenNames,
        areaCodes,
        addressDetails
    };
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.CommonData = {
        units,
        surnames,
        givenNames,
        areaCodes,
        addressDetails
    };
}