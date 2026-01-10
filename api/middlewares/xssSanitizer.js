import xss from 'xss';

const isPlainObject = (value) =>
    Object.prototype.toString.call(value) === '[object Object]';

const sanitizeValue = (value) => {
    if (typeof value === 'string') {
        return xss(value, {
            whiteList: {}, // allow no HTML tags
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script', 'style'],
        });
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (isPlainObject(value)) {
        return Object.keys(value).reduce((acc, key) => {
            acc[key] = sanitizeValue(value[key]);
            return acc;
        }, {});
    }

    return value;
};

const xssSanitizer = (req, res, next) => {
    ['body', 'query', 'params'].forEach((key) => {
        if (req[key]) {
            req[key] = sanitizeValue(req[key]);
        }
    });

    next();
};

export default xssSanitizer;

