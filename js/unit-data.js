// 单位换算数据

const units = {
    length: {
        name: '长度',
        units: {
            'um': { name: '微米', factor: 0.000001 },
            'mm': { name: '毫米', factor: 0.001 },
            'cm': { name: '厘米', factor: 0.01 },
            'm': { name: '米', factor: 1 },
            'km': { name: '千米', factor: 1000 },
            'in': { name: '英寸', factor: 0.0254 },
            'ft': { name: '英尺', factor: 0.3048 },
            'yd': { name: '码', factor: 0.9144 },
            'mi': { name: '英里', factor: 1609.344 },
            'nmi': { name: '海里', factor: 1852 }
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
            'lb': { name: '磅', factor: 0.453592 },
            'st': { name: '英石', factor: 6.35029 }
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
            'mm2': { name: '平方毫米', factor: 0.000001 },
            'cm2': { name: '平方厘米', factor: 0.0001 },
            'm2': { name: '平方米', factor: 1 },
            'km2': { name: '平方千米', factor: 1000000 },
            'ha': { name: '公顷', factor: 10000 },
            'in2': { name: '平方英寸', factor: 0.00064516 },
            'ft2': { name: '平方英尺', factor: 0.092903 },
            'yd2': { name: '平方码', factor: 0.836127 },
            'acre': { name: '英亩', factor: 4046.86 },
            'mi2': { name: '平方英里', factor: 2589988.11 }
        }
    },
    volume: {
        name: '体积',
        units: {
            'mm3': { name: '立方毫米', factor: 0.000000001 },
            'cm3': { name: '立方厘米', factor: 0.000001 },
            'ml': { name: '毫升', factor: 0.000001 },
            'l': { name: '升', factor: 0.001 },
            'm3': { name: '立方米', factor: 1 },
            'tsp': { name: '茶匙(美)', factor: 0.00000492892 },
            'tbsp': { name: '汤匙(美)', factor: 0.0000147868 },
            'floz': { name: '液盎司(美)', factor: 0.0000295735 },
            'cup': { name: '杯(美)', factor: 0.000236588 },
            'pt': { name: '品脱(美)', factor: 0.000473176 },
            'qt': { name: '夸脱(美)', factor: 0.000946353 },
            'gal': { name: '加仑(美)', factor: 0.00378541 },
            'gal_uk': { name: '加仑(英)', factor: 0.00454609 }
        }
    },
    speed: {
        name: '速度',
        units: {
            'mps': { name: '米/秒', factor: 1 },
            'kmh': { name: '千米/小时', factor: 0.277778 },
            'mph': { name: '英里/小时', factor: 0.44704 },
            'fps': { name: '英尺/秒', factor: 0.3048 },
            'knot': { name: '节', factor: 0.514444 }
        }
    },
    force: {
        name: '力',
        units: {
            'N': { name: '牛顿', factor: 1 },
            'kN': { name: '千牛', factor: 1000 },
            'lbf': { name: '磅力', factor: 4.44822 },
            'kgf': { name: '千克力', factor: 9.80665 },
            'dyn': { name: '达因', factor: 0.00001 }
        }
    },
    pressure: {
        name: '压力',
        units: {
            'Pa': { name: '帕斯卡', factor: 1 },
            'kPa': { name: '千帕', factor: 1000 },
            'MPa': { name: '兆帕', factor: 1000000 },
            'bar': { name: '巴', factor: 100000 },
            'mbar': { name: '毫巴', factor: 100 },
            'hPa': { name: '百帕', factor: 100 },
            'atm': { name: '标准大气压', factor: 101325 },
            'psi': { name: '磅/平方英寸', factor: 6894.76 },
            'mmHg': { name: '毫米汞柱', factor: 133.322 },
            'inHg': { name: '英寸汞柱', factor: 3386.39 }
        }
    },
    power: {
        name: '功率',
        units: {
            'W': { name: '瓦特', factor: 1 },
            'kW': { name: '千瓦', factor: 1000 },
            'MW': { name: '兆瓦', factor: 1000000 },
            'hp': { name: '马力(英)', factor: 745.7 },
            'ps': { name: '马力(公)', factor: 735.5 }
        }
    },
    energy: {
        name: '能量',
        units: {
            'J': { name: '焦耳', factor: 1 },
            'kJ': { name: '千焦', factor: 1000 },
            'cal': { name: '卡路里', factor: 4.184 },
            'kcal': { name: '千卡', factor: 4184 },
            'Wh': { name: '瓦时', factor: 3600 },
            'kWh': { name: '千瓦时', factor: 3600000 },
            'BTU': { name: '英热单位', factor: 1055.06 },
            'eV': { name: '电子伏特', factor: 1.60218e-19 }
        }
    },
    angle: {
        name: '角度',
        units: {
            'deg': { name: '度', factor: 1 },
            'rad': { name: '弧度', factor: 180 / Math.PI },
            'grad': { name: '百分度', factor: 0.9 },
            'arcmin': { name: '角分', factor: 1/60 },
            'arcsec': { name: '角秒', factor: 1/3600 }
        }
    },
    flow_rate: {
        name: '流量',
        units: {
            'm3s': { name: '立方米/秒', factor: 1 },
            'm3h': { name: '立方米/小时', factor: 1/3600 },
            'ls': { name: '升/秒', factor: 0.001 },
            'lmin': { name: '升/分钟', factor: 1/60000 },
            'lh': { name: '升/小时', factor: 1/3600000 },
            'gpm': { name: '加仑/分钟(美)', factor: 0.0000630902 }
        }
    }
};

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = units;
} else if (typeof window !== 'undefined') {
    window.UnitData = units;
}