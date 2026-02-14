// 单位换算数据

const units = {
    length: {
        name: '长度',
        units: {
            'mm': { name: '毫米', factor: 0.001 },
            'cm': { name: '厘米', factor: 0.01 },
            'm': { name: '米', factor: 1 },
            'km': { name: '千米', factor: 1000 },
            'in': { name: '英寸', factor: 0.0254 },
            'ft': { name: '英尺', factor: 0.3048 },
            'yd': { name: '码', factor: 0.9144 },
            'mi': { name: '英里', factor: 1609.344 }
        }
    },
    weight: {
        name: '重量',
        units: {
            'mg': { name: '毫克', factor: 0.000001 },
            'g': { name: '克', factor: 0.001 },
            'kg': { name: '千克', factor: 1 },
            't': { name: '吨', factor: 1000 },
            'oz': { name: '盎司', factor: 0.0283495 },
            'lb': { name: '磅', factor: 0.453592 }
        }
    },
    temperature: {
        name: '温度',
        units: {
            'celsius': { name: '摄氏度' },
            'fahrenheit': { name: '华氏度' },
            'kelvin': { name: '开尔文' }
        }
    },
    area: {
        name: '面积',
        units: {
            'sqmm': { name: '平方毫米', factor: 0.000001 },
            'sqcm': { name: '平方厘米', factor: 0.0001 },
            'sqm': { name: '平方米', factor: 1 },
            'ha': { name: '公顷', factor: 10000 },
            'sqkm': { name: '平方千米', factor: 1000000 },
            'sqin': { name: '平方英寸', factor: 0.00064516 },
            'sqft': { name: '平方英尺', factor: 0.092903 },
            'sqyd': { name: '平方码', factor: 0.836127 },
            'acre': { name: '英亩', factor: 4046.86 },
            'sqmi': { name: '平方英里', factor: 2589988.11 }
        }
    },
    volume: {
        name: '体积',
        units: {
            'ml': { name: '毫升', factor: 0.001 },
            'l': { name: '升', factor: 1 },
            'cum': { name: '立方米', factor: 1000 },
            'tsp': { name: '茶匙', factor: 0.00492892 },
            'tbsp': { name: '汤匙', factor: 0.0147868 },
            'floz': { name: '液盎司', factor: 0.0295735 },
            'cup': { name: '杯', factor: 0.24 },
            'pt': { name: '品脱', factor: 0.473176 },
            'qt': { name: '夸脱', factor: 0.946353 },
            'gal': { name: '加仑', factor: 3.78541 }
        }
    },
    speed: {
        name: '速度',
        units: {
            'mps': { name: '米/秒', factor: 1 },
            'kph': { name: '千米/小时', factor: 0.277778 },
            'mph': { name: '英里/小时', factor: 0.44704 },
            'fps': { name: '英尺/秒', factor: 0.3048 },
            'knot': { name: '节', factor: 0.514444 },
            'c': { name: '光速(你相信光吗就问你)', factor: 299792458 } // 光速 ≈ 299,792,458 米/秒
        }
    },
    force: {
        name: '力',
        units: {
            'N': { name: '牛顿', factor: 1 },
            'kN': { name: '千牛', factor: 1000 },
            'lbf': { name: '磅力', factor: 4.44822 }
        }
    },
    pressure: {
        name: '压力',
        units: {
            'Pa': { name: '帕斯卡', factor: 1 },
            'MPa': { name: '兆帕', factor: 1000000 },
            'bar': { name: '巴', factor: 100000 },
            'hPa': { name: '百帕', factor: 100 },
            'mmHg': { name: '毫米汞柱', factor: 133.322 }
        }
    },
    power: {
        name: '功率',
        units: {
            'W': { name: '瓦特', factor: 1 },
            'kW': { name: '千瓦', factor: 1000 },
            'MW': { name: '兆瓦', factor: 1000000 },
            'hp': { name: '马力', factor: 745.7 }
        }
    },
    energy: {
        name: '能量',
        units: {
            'J': { name: '焦耳', factor: 1 },
            'kWh': { name: '千瓦时', factor: 3600000 }
        }
    },
    frequency: {
        name: '频率',
        units: {
            'Hz': { name: '赫兹', factor: 1 },
            'kHz': { name: '千赫兹', factor: 1000 },
            'MHz': { name: '兆赫兹', factor: 1000000 }
        }
    },
    angle: {
        name: '角度',
        units: {
            'deg': { name: '度', factor: 1 },
            'rad': { name: '弧度', factor: 180/Math.PI }, // 正确的弧度到度换算因子
            'grad': { name: '百分度', factor: 0.9 }
        }
    },
    flow_rate: {
        name: '流量',
        units: {
            'l_per_min': { name: '升/分钟(L/min)', factor: 1/60 }, // 相对于 L/s
            'ncum_per_h': { name: '标准立方米/小时(Nm³/h)', factor: 1/3600 } // 相对于 m³/s
        }
    }
};

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = units;
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.UnitData = units;
}