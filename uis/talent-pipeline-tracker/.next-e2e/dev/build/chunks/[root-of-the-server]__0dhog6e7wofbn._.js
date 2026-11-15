module.exports = [
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/module [external] (module, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("module", () => require("module"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/loader-runner [external] (next/dist/compiled/loader-runner, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/loader-runner", () => require("next/dist/compiled/loader-runner"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/vm [external] (vm, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("vm", () => require("vm"));

module.exports = mod;
}),
"[turbopack-node]/transforms/transforms.ts [webpack_loaders] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Shared utilities for our 2 transform implementations.
 */ __turbopack_context__.s([
    "getReadEnvVariables",
    ()=>getReadEnvVariables
]);
// Patch process.env to track which env vars are read
const originalEnv = process.env;
const readEnvVars = new Set();
process.env = new Proxy(originalEnv, {
    get (target, prop) {
        if (typeof prop === 'string') {
            // We register the env var as dependency on the
            // current transform and all future transforms
            // since the env var might be cached in module scope
            // and influence them all
            readEnvVars.add(prop);
        }
        return Reflect.get(target, prop);
    },
    set (target, prop, value) {
        return Reflect.set(target, prop, value);
    }
});
function getReadEnvVariables() {
    return Array.from(readEnvVars);
}
}),
"[turbopack-node]/transforms/webpack-loaders-runtime.ts [webpack_loaders] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "evaluateBundle",
    ()=>evaluateBundle
]);
/**
 * In-memory CJS module evaluator for importModule bundles.
 *
 * The Rust side generates a full Node.js bundle (runtime + module chunks + entry
 * chunk) and sends the chunk code via IPC. This evaluator loads them in memory
 * using vm.compileFunction, wiring up a minimal CJS require that resolves
 * relative paths against an in-memory chunk map and delegates external packages
 * to the real Node.js require.
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$module__$5b$external$5d$__$28$module$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/module [external] (module, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$stream__$5b$external$5d$__$28$stream$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/stream [external] (stream, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$vm__$5b$external$5d$__$28$vm$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/vm [external] (vm, cjs)");
;
;
;
;
;
// Create a real Node.js require function rooted at the project directory.
// This bypasses Turbopack's module analysis (which can't handle dynamic
// require calls) while still resolving npm packages correctly.
const nodeRequire = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$module__$5b$external$5d$__$28$module$2c$__cjs$29$__["createRequire"])(process.cwd() + '/');
function evaluateBundle(result) {
    const chunkMap = new Map();
    const binaryMap = new Map();
    for (const chunk of result.chunks){
        if (chunk.code != null) {
            chunkMap.set('/' + chunk.path, chunk.code);
        }
        if (chunk.binary != null) {
            binaryMap.set('/' + chunk.path, Buffer.from(chunk.binary, 'base64'));
        }
    }
    // Patched fs module that intercepts reads of in-memory binary assets.
    // The Node.js runtime's WASM loader uses createReadStream() to load .wasm
    // files from disk; we need to redirect those reads to our in-memory buffers.
    let patchedFs;
    if (binaryMap.size > 0) {
        patchedFs = Object.create(__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"]);
        patchedFs.createReadStream = (filePath, ...args)=>{
            const buf = binaryMap.get(filePath);
            if (buf) {
                return __TURBOPACK__imported__module__$5b$externals$5d2f$stream__$5b$external$5d$__$28$stream$2c$__cjs$29$__["Readable"].from(buf);
            }
            return __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].createReadStream(filePath, ...args);
        };
    }
    const moduleCache = new Map();
    function inMemoryRequire(fromPath, request) {
        let resolved;
        if (request.startsWith('/')) {
            resolved = request;
        } else if (request.startsWith('./') || request.startsWith('../')) {
            resolved = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(fromPath), request);
        } else {
            // Intercept 'fs' to return the patched version when binary
            // assets are present (needed for WASM loading)
            if (request === 'fs' && patchedFs) {
                return patchedFs;
            }
            // External package — use the real Node.js require
            return nodeRequire(request);
        }
        const cached = moduleCache.get(resolved);
        if (cached) return cached.exports;
        const code = chunkMap.get(resolved);
        if (!code) {
            throw new Error(`importModule: chunk not found: ${resolved} (required from ${fromPath})`);
        }
        const mod = {
            exports: {}
        };
        moduleCache.set(resolved, mod);
        const localRequire = (req)=>inMemoryRequire(resolved, req);
        localRequire.resolve = nodeRequire.resolve;
        const fn = __TURBOPACK__imported__module__$5b$externals$5d2f$vm__$5b$external$5d$__$28$vm$2c$__cjs$29$__["default"].compileFunction(code, [
            'module',
            'exports',
            'require',
            '__filename',
            '__dirname'
        ], {
            filename: resolved
        });
        fn(mod, mod.exports, localRequire, resolved, __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(resolved));
        return mod.exports;
    }
    return inMemoryRequire('/', '/' + result.entryPath);
}
}),
"[turbopack-node]/transforms/webpack-loaders.ts [webpack_loaders] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>transform
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$compiled$2f$stacktrace$2d$parser$2f$index$2e$js__$5b$webpack_loaders$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[turbopack-node]/compiled/stacktrace-parser/index.js [webpack_loaders] (ecmascript)");
var __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$error$2e$ts__$5b$webpack_loaders$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[turbopack-node]/error.ts [webpack_loaders] (ecmascript)");
var __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$transforms$2f$transforms$2e$ts__$5b$webpack_loaders$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[turbopack-node]/transforms/transforms.ts [webpack_loaders] (ecmascript)");
var __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$transforms$2f$webpack$2d$loaders$2d$runtime$2e$ts__$5b$webpack_loaders$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[turbopack-node]/transforms/webpack-loaders-runtime.ts [webpack_loaders] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
;
;
;
;
;
;
;
const { runLoaders } = __turbopack_context__.r("[externals]/next/dist/compiled/loader-runner [external] (next/dist/compiled/loader-runner, cjs)");
const contextDir = process.cwd();
const LogType = Object.freeze({
    error: 'error',
    warn: 'warn',
    info: 'info',
    log: 'log',
    debug: 'debug',
    trace: 'trace',
    group: 'group',
    groupCollapsed: 'groupCollapsed',
    groupEnd: 'groupEnd',
    profile: 'profile',
    profileEnd: 'profileEnd',
    time: 'time',
    clear: 'clear',
    status: 'status'
});
const loaderFlag = 'LOADER_EXECUTION';
const cutOffByFlag = (stack, flag)=>{
    const errorStack = stack.split('\n');
    for(let i = 0; i < errorStack.length; i++){
        if (errorStack[i].includes(flag)) {
            errorStack.length = i;
        }
    }
    return errorStack.join('\n');
};
/**
 * @param stack stack trace
 * @returns stack trace without the loader execution flag included
 */ const cutOffLoaderExecution = (stack)=>cutOffByFlag(stack, loaderFlag);
class DummySpan {
    traceChild() {
        return new DummySpan();
    }
    traceFn(fn) {
        return fn(this);
    }
    async traceAsyncFn(fn) {
        return await fn(this);
    }
    stop() {
        return;
    }
}
const transform = (ipc, content, name, query, loaders, target, mode, sourceMap)=>{
    return new Promise((resolve, reject)=>{
        const resource = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["resolve"])(contextDir, name);
        const resourceDir = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["dirname"])(resource);
        const loadersWithOptions = loaders.map((loader)=>typeof loader === 'string' ? {
                loader,
                options: {}
            } : loader);
        const buildDependencies = new Set();
        const logs = [];
        runLoaders({
            resource: resource + query,
            context: {
                version: 2,
                _module: {
                    // For debugging purpose, if someone find context is not full compatible to
                    // webpack they can guess this comes from turbopack
                    __reserved: 'TurbopackContext'
                },
                currentTraceSpan: new DummySpan(),
                rootContext: contextDir,
                target,
                mode,
                sourceMap,
                getOptions () {
                    const entry = this.loaders[this.loaderIndex];
                    return entry.options && typeof entry.options === 'object' ? entry.options : {};
                },
                addBuildDependency (dependency) {
                    buildDependencies.add(dependency);
                },
                fs: {
                    readFile (p, optionsOrCb, maybeCb) {
                        ipc.sendRequest({
                            type: 'trackFileRead',
                            file: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["resolve"])(p)
                        }).then(()=>{
                            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFile(p, optionsOrCb, maybeCb);
                        }, (err)=>{
                            ipc.sendError(err);
                        // sendError is going to stop the process, no need to call callback
                        });
                    }
                },
                resolve (lookupPath, request, callback) {
                    return this.getResolve()(lookupPath, request, callback);
                },
                getResolve: (options = {})=>{
                    const rustOptions = {
                        aliasFields: undefined,
                        conditionNames: undefined,
                        noPackageJson: false,
                        extensions: undefined,
                        mainFields: undefined,
                        noExportsField: false,
                        mainFiles: undefined,
                        noModules: false,
                        preferRelative: false
                    };
                    if (options.alias) {
                        if (!Array.isArray(options.alias) || options.alias.length > 0) {
                            throw new Error('alias resolve option is not supported');
                        }
                    }
                    if (options.aliasFields) {
                        if (!Array.isArray(options.aliasFields)) {
                            throw new Error('aliasFields resolve option must be an array');
                        }
                        rustOptions.aliasFields = options.aliasFields;
                    }
                    if (options.conditionNames) {
                        if (!Array.isArray(options.conditionNames)) {
                            throw new Error('conditionNames resolve option must be an array');
                        }
                        rustOptions.conditionNames = options.conditionNames;
                    }
                    if (options.descriptionFiles) {
                        if (!Array.isArray(options.descriptionFiles) || options.descriptionFiles.length > 0) {
                            throw new Error('descriptionFiles resolve option is not supported');
                        }
                        rustOptions.noPackageJson = true;
                    }
                    if (options.extensions) {
                        if (!Array.isArray(options.extensions)) {
                            throw new Error('extensions resolve option must be an array');
                        }
                        rustOptions.extensions = options.extensions;
                    }
                    if (options.mainFields) {
                        if (!Array.isArray(options.mainFields)) {
                            throw new Error('mainFields resolve option must be an array');
                        }
                        rustOptions.mainFields = options.mainFields;
                    }
                    if (options.exportsFields) {
                        if (!Array.isArray(options.exportsFields) || options.exportsFields.length > 0) {
                            throw new Error('exportsFields resolve option is not supported');
                        }
                        rustOptions.noExportsField = true;
                    }
                    if (options.mainFiles) {
                        if (!Array.isArray(options.mainFiles)) {
                            throw new Error('mainFiles resolve option must be an array');
                        }
                        rustOptions.mainFiles = options.mainFiles;
                    }
                    if (options.modules) {
                        if (!Array.isArray(options.modules) || options.modules.length > 0) {
                            throw new Error('modules resolve option is not supported');
                        }
                        rustOptions.noModules = true;
                    }
                    if (options.restrictions) {
                    // TODO This is ignored for now
                    }
                    if (options.dependencyType) {
                    // TODO This is ignored for now
                    }
                    if (options.preferRelative) {
                        if (typeof options.preferRelative !== 'boolean') {
                            throw new Error('preferRelative resolve option must be a boolean');
                        }
                        rustOptions.preferRelative = options.preferRelative;
                    }
                    return (lookupPath, request, callback)=>{
                        if (__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(request)) {
                            // Relativize absolute requests. Turbopack disallow them in JS code, but here it's
                            // generated programatically and there is a smaller problem of
                            // non-cacheable/non-portable builds.
                            request = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(lookupPath, request);
                            // On Windows, the path might be still absolute if it's on a different drive. Just
                            // let the resolver throw the error in that case.
                            if (!__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(request) && request.split(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].sep)[0] !== '..') {
                                request = './' + request;
                            }
                        }
                        const promise = ipc.sendRequest({
                            type: 'resolve',
                            options: rustOptions,
                            lookupPath,
                            request
                        }).then((unknownResult)=>{
                            let result = unknownResult;
                            if (result && typeof result.path === 'string') {
                                return result.path;
                            } else {
                                throw Error('Expected { path: string } from resolve request');
                            }
                        });
                        if (callback) {
                            promise.then((result)=>callback(undefined, result), (err)=>callback(err)).catch((err)=>{
                                ipc.sendError(err);
                            });
                        } else {
                            return promise;
                        }
                    };
                },
                emitWarning: makeErrorEmitter('warning', ipc),
                emitError: makeErrorEmitter('error', ipc),
                importModule (request, optionsOrCallback, maybeCallback) {
                    // Support both (request, options, callback) and (request, options) -> Promise
                    let callback;
                    if (typeof optionsOrCallback === 'function') {
                        callback = optionsOrCallback;
                    } else {
                        callback = maybeCallback;
                    }
                    const doImport = async ()=>{
                        let actualRequest = request;
                        // The webpack API allows absolute paths in importModule requests,
                        // but Turbopack's resolver expects relative paths. Convert absolute
                        // paths to relative ones for backward compatibility with webpack loaders.
                        if (__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(request)) {
                            actualRequest = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(resourceDir, request);
                            if (!__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(actualRequest) && actualRequest.split(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].sep)[0] !== '..') {
                                actualRequest = './' + actualRequest;
                            }
                        }
                        const result = await ipc.sendRequest({
                            type: 'importModule',
                            lookupPath: resourceDir,
                            request: actualRequest
                        });
                        return (0, __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$transforms$2f$webpack$2d$loaders$2d$runtime$2e$ts__$5b$webpack_loaders$5d$__$28$ecmascript$29$__["evaluateBundle"])(result);
                    };
                    if (!callback) {
                        return doImport();
                    }
                    doImport().then((result)=>callback(null, result), (err)=>callback(err));
                },
                getLogger (name) {
                    const logFn = (logType, ...args)=>{
                        let trace;
                        switch(logType){
                            case LogType.warn:
                            case LogType.error:
                            case LogType.trace:
                            case LogType.debug:
                                trace = (0, __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$compiled$2f$stacktrace$2d$parser$2f$index$2e$js__$5b$webpack_loaders$5d$__$28$ecmascript$29$__["parse"])(cutOffLoaderExecution(new Error('Trace').stack).split('\n').slice(3).join('\n'));
                                break;
                            default:
                                break;
                        }
                        // Batch logs messages to be sent at the end
                        logs.push({
                            time: Date.now(),
                            logType,
                            args,
                            trace
                        });
                    };
                    let timers;
                    let timersAggregates;
                    // See https://github.com/webpack/webpack/blob/a48c34b34d2d6c44f9b2b221d7baf278d34ac0be/lib/logging/Logger.js#L8
                    return {
                        error: logFn.bind(this, LogType.error),
                        warn: logFn.bind(this, LogType.warn),
                        info: logFn.bind(this, LogType.info),
                        log: logFn.bind(this, LogType.log),
                        debug: logFn.bind(this, LogType.debug),
                        assert: (assertion, ...args)=>{
                            if (!assertion) {
                                logFn(LogType.error, ...args);
                            }
                        },
                        trace: logFn.bind(this, LogType.trace),
                        clear: logFn.bind(this, LogType.clear),
                        status: logFn.bind(this, LogType.status),
                        group: logFn.bind(this, LogType.group),
                        groupCollapsed: logFn.bind(this, LogType.groupCollapsed),
                        groupEnd: logFn.bind(this, LogType.groupEnd),
                        profile: logFn.bind(this, LogType.profile),
                        profileEnd: logFn.bind(this, LogType.profileEnd),
                        time: (label)=>{
                            timers = timers || new Map();
                            timers.set(label, process.hrtime());
                        },
                        timeLog: (label)=>{
                            const prev = timers && timers.get(label);
                            if (!prev) {
                                throw new Error(`No such label '${label}' for WebpackLogger.timeLog()`);
                            }
                            const time = process.hrtime(prev);
                            logFn(LogType.time, [
                                label,
                                ...time
                            ]);
                        },
                        timeEnd: (label)=>{
                            const prev = timers && timers.get(label);
                            if (!prev) {
                                throw new Error(`No such label '${label}' for WebpackLogger.timeEnd()`);
                            }
                            const time = process.hrtime(prev);
                            /** @type {Map<string | undefined, [number, number]>} */ timers.delete(label);
                            logFn(LogType.time, [
                                label,
                                ...time
                            ]);
                        },
                        timeAggregate: (label)=>{
                            const prev = timers && timers.get(label);
                            if (!prev) {
                                throw new Error(`No such label '${label}' for WebpackLogger.timeAggregate()`);
                            }
                            const time = process.hrtime(prev);
                            /** @type {Map<string | undefined, [number, number]>} */ timers.delete(label);
                            /** @type {Map<string | undefined, [number, number]>} */ timersAggregates = timersAggregates || new Map();
                            const current = timersAggregates.get(label);
                            if (current !== undefined) {
                                if (time[1] + current[1] > 1e9) {
                                    time[0] += current[0] + 1;
                                    time[1] = time[1] - 1e9 + current[1];
                                } else {
                                    time[0] += current[0];
                                    time[1] += current[1];
                                }
                            }
                            timersAggregates.set(label, time);
                        },
                        timeAggregateEnd: (label)=>{
                            if (timersAggregates === undefined) return;
                            const time = timersAggregates.get(label);
                            if (time === undefined) return;
                            timersAggregates.delete(label);
                            logFn(LogType.time, [
                                label,
                                ...time
                            ]);
                        }
                    };
                }
            },
            loaders: loadersWithOptions.map((loader)=>({
                    loader: /*TURBOPACK member replacement*/ __turbopack_context__.x.resolve(loader.loader, {
                        paths: [
                            contextDir,
                            resourceDir
                        ]
                    }),
                    options: loader.options
                })),
            readResource: (_filename, callback)=>{
                // TODO assuming that filename === resource, but loaders might change that
                let data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content.binary, 'base64');
                callback(null, data);
            }
        }, (err, result)=>{
            if (logs.length) {
                ipc.sendInfo({
                    type: 'log',
                    logs: logs
                });
                logs.length = 0;
            }
            ipc.sendInfo({
                type: 'dependencies',
                envVariables: (0, __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$transforms$2f$transforms$2e$ts__$5b$webpack_loaders$5d$__$28$ecmascript$29$__["getReadEnvVariables"])(),
                filePaths: [
                    ...result.fileDependencies,
                    ...result.missingDependencies
                ],
                directories: result.contextDependencies.map((dep)=>[
                        dep,
                        '**'
                    ]),
                buildDependencyRequests: [
                    ...buildDependencies
                ].map((dependency)=>{
                    // Webpack uses a trailing slash or backslash to identify directory build dependencies:
                    // https://github.com/webpack/webpack/blob/v5.98.0/lib/FileSystemInfo.js#L1741-L1748
                    const isDirectory = /[\\/]$/.test(dependency);
                    let request = isDirectory ? dependency.slice(0, -1) : dependency;
                    if (__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(request)) {
                        request = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(contextDir, request);
                        if (!__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(request) && request.split(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].sep)[0] !== '..') {
                            request = `./${request}`;
                        }
                    }
                    request = ("TURBOPACK compile-time truthy", 1) ? request : "TURBOPACK unreachable";
                    return [
                        request,
                        isDirectory
                    ];
                }).sort(([a], [b])=>a.localeCompare(b))
            });
            if (err) {
                // Resolve loader paths to include in the error message using
                // the same "(from ...)" style as webpack's format-webpack-messages.
                const loaderPathList = loadersWithOptions.map((l)=>{
                    try {
                        return /*TURBOPACK member replacement*/ __turbopack_context__.x.resolve(l.loader, {
                            paths: [
                                contextDir,
                                resourceDir
                            ]
                        });
                    } catch  {
                        return l.loader;
                    }
                });
                const loaderPaths = loaderPathList.join(', ');
                if (!(err instanceof Error)) {
                    // String throws lose their stack trace, so we create a
                    // synthetic one pointing at the loader.
                    const wrappedErr = new Error(`${String(err)}\n  (from ${loaderPaths})`);
                    wrappedErr.stack = `Error: ${String(err)}\n    at loader (${loaderPaths})`;
                    return reject(wrappedErr);
                }
                // Only append "(from ...)" when no loader path is already
                // visible in the stack trace, to avoid redundant noise.
                const stack = typeof err.stack === 'string' ? err.stack : '';
                if (!loaderPathList.some((p)=>stack.includes(p))) {
                    err.message += `\n  (from ${loaderPaths})`;
                }
                return reject(err);
            }
            if (!result.result) return reject(new Error('No result from loaders'));
            const [source, map] = result.result;
            const resolvedValue = {
                source: Buffer.isBuffer(source) ? {
                    binary: source.toString('base64')
                } : source,
                map: typeof map === 'string' ? map : typeof map === 'object' ? JSON.stringify(map) : undefined
            };
            // Delay resolution by one event loop turn to catch deferred errors
            // from loaders (e.g. unhandled Promise rejections, setTimeout throws).
            // During this delay, uncaughtException/unhandledRejection handlers can
            // fire and send the error via IPC before we send the 'end' message.
            setTimeout(()=>resolve(resolvedValue), 0);
        });
    });
};
;
function makeErrorEmitter(severity, ipc) {
    return function(error) {
        ipc.sendInfo({
            type: 'emittedError',
            severity: severity,
            error: (0, __TURBOPACK__imported__module__$5b$turbopack$2d$node$5d2f$error$2e$ts__$5b$webpack_loaders$5d$__$28$ecmascript$29$__["structuredError"])(error)
        });
    };
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0dhog6e7wofbn._.js.map