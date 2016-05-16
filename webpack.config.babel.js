import path from 'path';

import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import { Config } from 'cudl-webpack-config/lib/config';


let extractCss = new ExtractTextPlugin(
        'viewer-[contenthash].css', {allChunks: true});

export default new Config()
    .extend('./webpack.config.base')
    .merge({
        module: {
            loaders: [
                // Transform CSS files with PostCSS
                {
                    test: /\.css$/,
                    include: path.resolve(__dirname, 'src/stylesheets'),
                    loader: extractCss.extract(
                        'style-loader',
                        'css-loader?sourceMap!postcss-loader?sourceMap')
                }
            ]
        },
        plugins: [
            extractCss,
            new HtmlWebpackPlugin({
                filename: 'viewer.html',
                template: path.resolve(__dirname,
                                       'src/html-templates/html.jade')
            }),
            new webpack.DefinePlugin({
                DEV: JSON.stringify(false)
            })
        ]
    });
