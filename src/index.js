const select = require(`unist-util-select`)
const makeRelative = require(`./make-relative`)
const cheerio = require(`cheerio`)
const Promise = require(`bluebird`)

module.exports = async ({ markdownNode, markdownAST, getNode }, options) => {
	const MarkdownImgs = select(markdownAST, `image`)
	const rawHtmlNodes = select(markdownAST, `html`)

	const { absolutePath } = getNode(markdownNode.parent)
	
	return Promise.all(
		MarkdownImgs.map(imgNode => {
			return new Promise( async (resolve) => {
				imgNode.url = await makeRelative(absolutePath, imgNode.url, options)
				return resolve(imgNode) 
			} )
		}).concat(
			rawHtmlNodes.map( (node) => {
				return new Promise( async (resolve) => {
					if (!node.value) {
						return resolve()
					}

					const $ = cheerio.load(node.value)
					if ($(`img`).length === 0) {
						// No img tags
						return resolve()
					}

					let imageRefs = []
					$(`img`).each(function() {
						imageRefs.push($(this))
					})
					
					for (let thisImg of imageRefs) {
						thisImg.attr(`src`, await makeRelative(absolutePath, thisImg.attr(`src`), options));
					}
					
					node.type = `html`
					node.value = $(`body`).html()
					return resolve(node)
				} )
			} )
		)
	)
}
