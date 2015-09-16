import path from 'path';

import _ from 'lodash';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import {getConfig} from './webpack.config.base';


let extractCss = new ExtractTextPlugin(
        'viewer-[contenthash].css', {allChunks: true});


export default getConfig({
    dev: false,
    filterOutput: output => {
        output.filename = 'viewer-[chunkhash].js';
        return output;
    },
    filterLoaders: loaders => {
        return loaders.concat([
            // Transform CSS files with PostCSS
            {
                test: /\.css$/,
                include: path.resolve(__dirname, 'src/stylesheets'),
                loader: extractCss.extract(
                    'style-loader',
                    'css-loader?sourceMap!postcss-loader?sourceMap')
            }
        ]);
    },
    filterPlugins: plugins => {
        return plugins.concat([
            extractCss,

            new HtmlWebpackPlugin({
                filename: 'viewer.html',
                template: path.resolve(__dirname,
                                       'src/html-templates/html.jade')
            })
        ]);
    }
});
