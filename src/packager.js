const path = require('path')
const fse = require('fs-extra')
const { Packager } = require('parcel-bundler')
const { createSprite } = require('./utils')

class SvgPackager extends Packager {
  constructor (bundle, bundler) {
    super(bundle, bundler)

    this.svgList = []
  }

  /**
   * @desc check if a similar svg is already in svg list based on hash content instead of file path
   * @param {object} svgItem - svg to check
   * @param {string} svgItem.hash - hash of svg content
   * @return {boolean}
   */
  svgAlreadyExists (svgItem) {
    const itemIndex = this.svgList.findIndex(({ hash }) => hash === svgItem.hash)
    return itemIndex >= 0
  }

  /**
   * @desc add an svg item in svg list to sprite
   * @param {object} svgItem - svg to add
   */
  addSvgItem (svgItem) {
    this.svgList = [...this.svgList, svgItem]
  }

  /**
   * @desc copy svg file like RawAsset does
   * @param {Asset} asset - svg asset
   */
  async copyToDist (asset) {
    const content = await fse.readFile(asset.name)

    // Create sub-directories if needed
    if (this.bundle.name.includes(path.sep)) {
      await fse.mkdirp(path.dirname(this.bundle.name))
    }

    this.size = content.length
    await fse.writeFile(this.bundle.name, content)
  }

  /**
   * @desc promisify `this.dest.end`.
   * This function is created to wait `dest` stream to be closed before `getSize`
   * @param {String} sprite - generated svg sprite
   */
  writeSprite (sprite) {
    return new Promise((resolve, reject) => {
      this.dest.end(sprite, error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * @desc function run by parcel for each asset of a package
   * @param {Asset} asset - svg asset
   */
  async addAsset (asset) {
    if (!asset.generated.svg) {
      await this.copyToDist(asset)
    } else {
      const { hash, path: svgPath, content } = asset.generated.svg
      const svgItem = { hash, path: svgPath, content }
      const alreadyExists = this.svgAlreadyExists(svgItem)

      if (!alreadyExists) {
        this.addSvgItem(svgItem)
      }
    }
  }

  /**
   * @desc function run by parcel after `this.end` which return size of package
   */
  getSize () {
    if (this.size !== undefined) {
      // if assets files are loaded from a style file
      return this.size
    }
    if (this.dest.closed) {
      // if assets file are loaded from js and stream is closed
      return this.dest.bytesWritten
    }
    return 0
  }

  /**
   * @desc function run by parcel when all assets of package are loaded
   */
  async end () {
    if (this.svgList.length > 0) {
      const sprite = await createSprite(this.svgList)
      // use await here to avoid `getSize` to be called when stream is writting
      await this.writeSprite(sprite)
    }
  }
}

module.exports = SvgPackager
