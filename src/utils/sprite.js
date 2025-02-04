const SVGSpriter = require('svg-sprite')
const findLast = require('lodash/findLast')

/**
 * @desc Create id generator function to inject id from svgList in svg sprite
 * @param {object[]} svgList - list of svg info for sprite creation
 * @param {string} svgList[].path
 * @param {string} svgList[].hash
 * @param {string} svgList[].content
 * @return {createIdGenerator~generator}
 */
function createIdGenerator (svgList) {
  /**
   * @desc Generate the symbol id of a svg from file name
   * @param {string} defaultId - default id
   * @param {File} file - vinyl file input
   * @return {string} the symbol id
   */
  function generator (defaultId, file) {
    const svgItem = findLast(svgList, item => item.path === file.path)
    if (!svgItem) throw new Error(`File ${file.path} not found in svg list during id generation`)
    return svgItem.hash
  }

  return generator
}

/**
 * @desc Create svg-sprite config to generate symbol ready to be injected in html body
 * This allow id generator function to get id generated in svgList
 * @param {object[]} svgList - list of svg info for sprite creation
 * @param {string} svgList[].path
 * @param {string} svgList[].hash
 * @param {string} svgList[].content
 * @return {Promise} promise with svg sprite string
 */
function createConfig (svgList) {
  return {
    shape: {
      id: {
        generator: createIdGenerator(svgList)
      }
    },
    mode: {
      symbol: {
        inline: true
      }
    }
  }
}

/**
 * @desc Generate a function which add a file in a spriter
 * @param {SVGSpriter} spriter - spriter where to add file
 * @return {addFileInSpriter~addFile}
 */
function addFileInSpriter (spriter) {
  /**
   * @desc Add file
   * @param {object} svgInfo
   * @param {string} svgInfo.id
   * @param {string} svgInfo.path
   * @param {string} svgInfo.content
   * @return {Promise} Promise resolved when svg file is read an added in spriter
   */
  function addFile (svgInfo) {
    spriter.add(svgInfo.path, null, svgInfo.content)
  }
  return addFile
}

/**
 * @desc Compile svg files to a string
 * @param {SVGSpriter} spriter - spriter which contain files to compile
 * @return {Promise} promise with result as a string
 */
function compileSprite (spriter) {
  return new Promise((resolve, reject) => {
    spriter.compile((error, result) => {
      if (error) return reject(error)

      const { contents } = result.symbol.sprite
      return resolve(contents.toString('utf8'))
    })
  })
}

/**
 * @desc Create a svg sprite with <symbol> elements
 * @param {object[]} svgList - list of svg info for sprite creation
 * @param {string} svgList[].path
 * @param {string} svgList[].hash
 * @param {string} svgList[].content
 * @return {Promise} promise with svg sprite string
 */
function createSprite (svgList) {
  const spriterConfig = createConfig(svgList)
  const spriter = new SVGSpriter(spriterConfig)

  svgList.map(addFileInSpriter(spriter))

  return compileSprite(spriter)
}

module.exports = {
  createSprite
}
