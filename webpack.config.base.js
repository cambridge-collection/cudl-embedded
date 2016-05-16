import path from 'path';

import _ from 'lodash';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import SaveAssetsJson from 'assets-webpack-plugin';

import { Config } from 'cudl-webpack-config/lib/config';

export const OUT_DIR = path.join(__dirname, 'built');
export const CONFIG_KEYS = ['googleAnalyticsTrackingId', 'metadataUrlPrefix',
                   'metadataUrlSuffix', 'dziUrlPrefix', 'metadataUrlHost'];

let BABEL_LOADER, FILE_LOADER, WEB_ASSETS;


export function getAppConfig() {
    var configFile = process.env.CONFIG || './config/default';
    var config = require(configFile);

    if(!_(CONFIG_KEYS).map(function(k) { return k in config; }).all()) {
        throw new Error(`Config file does not define all keys: ${configFile}`);
    }

    return config;
}

export default new Config().merge({
    context: __dirname,
    entry: './src/scripts/init.js',
    devtool: 'source-map',
    output: {
        path: OUT_DIR,
        filename: 'viewer-[chunkhash].js'
    },
    resolve: {
        modulesDirectories: ['node_modules', 'bower_components'],
        root: [
            path.join(__dirname, 'src/lib')
        ],
        alias: {
            'openseadragon': 'openseadragon/built-openseadragon/' +
                             'openseadragon/openseadragon'
        }
    },
    module: {
        loaders: [
            // Shim openseadragon as a commonjs module
            {
                test: /\/openseadragon\.js$/,
                include: path.resolve(__dirname,
                                      'bower_components/openseadragon'),
                loader: 'exports?OpenSeadragon'
            },
            // Shim modernizr as a commonjs module
            {
                test: /\/modernizr\.custom(\.js)?$/,
                include: path.resolve(__dirname, 'src/lib'),
                loader: 'imports?this=>global!exports?Modernizr'
            },
            // Hash image files
            {
                test: /\.(png|jpg|gif|woff2?|eot|ttf|svg)(\?.*)?$/,
                loader: 'file?name=[name]-[hash].[ext]'
            },
            // Use Babel for new js feature support
            {
                test: /\.js$/,
                include: path.resolve(__dirname, 'src/scripts'),
                loader: require.resolve('babel-loader')
            },
            {
                test: /\.jade$/,
                include: path.resolve(__dirname, 'src/html-templates'),
                loader: 'jade-loader'
            }
        ]
    },

    // The css generated from the less gets run through these
    // postcss filters.
    postcss: [require('autoprefixer')],

    plugins: [
        new webpack.DefinePlugin({
            CONFIG: JSON.stringify(_.pick(getAppConfig(), CONFIG_KEYS)),
            VERSION: JSON.stringify(require('./package.json').version)
        })
    ]
});
