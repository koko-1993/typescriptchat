const path = require('path');

module.exports = {
    entry: {
        app:"./src/app.ts",
        authcheck:"./src/authcheck.ts",
        authsignin:"./src/authsignin.ts",
        authsignup:"./src/authsignup.ts",
        authresetpassword:"./src/authresetpassword.ts",
        authprofile:"./src/authprofile.ts"
    },
    mode: 'development',            // development or production , add this line from ->https://webpack.js.org/ > Documentation > Configuration > mode
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',  // eg. app.js , authcheck.js,....
        path: path.resolve(__dirname, 'dist'),  // change to public
    },
    devServer: {
        static: {
            directory: path.join(__dirname, './'),
        },
        compress: true,
        port: 9000,
    },
};