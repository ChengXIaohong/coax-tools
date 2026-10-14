// 模拟测试数据

// 测试身份数据工具测试数据
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

// 所有测试数据集合
const allTestData = {
    'id-generator': idGeneratorTestData,
    'image-compressor': imageCompressorTestData,
    'json-formatter': jsonFormatterTestData
};