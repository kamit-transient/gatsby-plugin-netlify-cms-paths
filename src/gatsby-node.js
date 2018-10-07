const makeRelative = require(`./make-relative`)

const walkObject = async (obj, iteratee, ignoreKeys = []) => {
	for (let prop in obj) {
		if ( ignoreKeys.indexOf(prop) !== -1 ) {
			continue;
		}

		switch (typeof obj[prop]) {
			case 'array':
				obj[prop] = await walkArray(obj[prop], iteratee, ignoreKeys)
				break;
			case 'object':
				obj[prop] = await walkObject(obj[prop], iteratee, ignoreKeys)
				break;
			default:
				obj[prop] = await iteratee(obj[prop])
		}
	}

	return obj
}

const walkArray = async (arr, iteratee, ignoreKeys = []) => {
	return arr.map( async (i) => {
		let result

		switch (typeof i) {
			case 'array':
				result = await walkArray(i, iteratee, ignoreKeys)
				break;
			case 'object':
				result = await walkObject(i, iteratee, ignoreKeys)
				break;
			default:
				result = await iteratee(i)
		}

		return result
	} )
}

exports.onCreateNode = async ({ node, getNode }, options) => {
	const commonProps = ['id', '_PARENT', 'parent', 'children', 'internal']

	let nodeAbsPath

	const iteratee = async (val) => {
		return await makeRelative(nodeAbsPath, val, options)
	}
	
	if (node.internal.type === `MarkdownRemark`) {
		nodeAbsPath = node.fileAbsolutePath

		if(typeof node.frontmatter === `object`) {
			await walkObject(node.frontmatter, iteratee, commonProps)
		}
	} else if (/^\w+Yaml$/.test(node.internal.type) ) {
		nodeAbsPath = getNode(node.parent).absolutePath

		await walkObject(node, iteratee, commonProps)
	}
}
