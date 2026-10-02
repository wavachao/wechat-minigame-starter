'use strict';
const { boot } = require('./src/main');
const { createPlatform } = require('./src/platform');
boot(createPlatform());
