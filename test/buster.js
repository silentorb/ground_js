var config = module.exports;

config["My tests"] = {
    env: "node",
    rootPath: "../",
    sources: [
//        "lib/mylib.js",    // Paths are relative to config file
//        "lib/**/*.js"      // Glob patterns supported
    ],
    tests: [
        "test/tests/*-test.coffee"
    ]
};

// Add more configuration groups as needed