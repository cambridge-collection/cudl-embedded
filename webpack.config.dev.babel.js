import path from 'path';

import webpack from 'webpack';

import { Config } from 'cudl-webpack-config/lib/config';


export default new Config()
    .extend('./webpack.config.base')
    .merge({
        output: {
            // The public path must be absolute to have assets resolve from CSS
            // files, as they're created as Blobs which are relative to something
            // like chrome:blob rather than the page URL, so relative URLs don't
            // resolve correctly.
            publicPath: 'http://localhost:8080/',
            filename: 'viewer.js'
        },
        module: {
            loaders: [
                // Transform CSS files with PostCSS
                {
                    test: /\.css$/,
                    include: path.resolve(__dirname, 'src/stylesheets'),
                    loaders: ['style', 'css?sourceMap', 'postcss?sourceMap']
                }
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                DEV: JSON.stringify(true)
            })
        ]
    });
