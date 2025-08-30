"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionConfigs = void 0;
exports.productionConfigs = {
    critical: {
        region: "europe-west1",
        memory: "1GiB",
        cpu: 2.0,
        maxInstances: 20,
        minInstances: 3,
        concurrency: 10
    },
    webhook: {
        region: "europe-west1",
        memory: "512MiB",
        cpu: 1.0,
        maxInstances: 15,
        minInstances: 2,
        concurrency: 15
    },
    standard: {
        region: "europe-west1",
        memory: "256MiB",
        cpu: 0.5,
        maxInstances: 8,
        minInstances: 1,
        concurrency: 5
    },
    admin: {
        region: "europe-west1",
        memory: "256MiB",
        cpu: 0.25,
        maxInstances: 3,
        minInstances: 0,
        concurrency: 1
    }
};
//# sourceMappingURL=productionConfigs.js.map