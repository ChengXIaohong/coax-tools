// 模拟测试数据

// 单位换算器测试数据
const converterTestData = {
    length: {
        fromValue: 1000,
        fromUnit: 'm',
        toUnit: 'km',
        expected: 1
    },
    weight: {
        fromValue: 1000,
        fromUnit: 'g',
        toUnit: 'kg',
        expected: 1
    },
    temperature: {
        fromValue: 0,
        fromUnit: 'C',
        toUnit: 'F',
        expected: 32
    }
};

// 模拟数据生成器测试数据
const dataGeneratorTestData = {
    rowCount: 10,
    options: {
        generateIndex: true,
        generateIp: true,
        generatePhone: true,
        generatePlate: true,
        generateTime: true,
        generateName: true
    }
};

// 身份证生成器测试数据
const idGeneratorTestData = {
    gender: 'random',
    minAge: 18,
    maxAge: 65,
    area: 'random'
};

// 图片压缩工具测试数据
const imageCompressorTestData = {
    quality: 80,
    maxWidth: 1920
};

// JSON格式化工具测试数据
const jsonFormatterTestData = {
    input: '{"name":"张三","age":30,"city":"北京"}',
    indent: 4
};

// 密码生成器测试数据
const passwordGeneratorTestData = {
    length: 12,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true
};

// 文本转换工具测试数据
const textConverterTestData = {
    input: 'hello world',
    conversions: {
        toUpperCase: 'HELLO WORLD',
        toLowerCase: 'hello world',
        capitalize: 'Hello World',
        camelCase: 'helloWorld',
        snakeCase: 'hello_world',
        kebabCase: 'hello-world'
    }
};

// 时间戳转换工具测试数据
const timestampConverterTestData = {
    timestamp: 1700000000,
    date: '2023-11-14T14:13:20'
};

// 所有测试数据集合
const allTestData = {
    converter: converterTestData,
    'data-generator': dataGeneratorTestData,
    'docx-converter': {}, // 该工具需要实际文件上传，无法简单模拟
    'id-generator': idGeneratorTestData,
    'image-compressor': imageCompressorTestData,
    'json-formatter': jsonFormatterTestData,
    'password-generator': passwordGeneratorTestData,
    'text-converter': textConverterTestData,
    'text-reader': {}, // 该工具需要实际文件上传，无法简单模拟
    'text-slicer': {}, // 该工具需要实际文件上传，无法简单模拟
    'timestamp-converter': timestampConverterTestData
};