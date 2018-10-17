const makeRelative = require(`./make-relative`)

const isObject = (obj) => {
  return obj === Object(obj);
}

const walkObject = async (obj, iteratee, ignoreKeys = []) => {
	for (let prop in obj) {
		if ( ! obj[prop] || typeof obj[prop].then === 'function' || ignoreKeys.indexOf(prop) !== -1 ) {
			continue;
		}
		
		if ( Array.isArray(obj[prop]) ) {
			await walkArray(obj[prop], iteratee, ignoreKeys, true)
		} else if ( isObject(obj[prop]) ) {
			obj[prop] = await walkObject(obj[prop], iteratee, ignoreKeys)
		} else {
			obj[prop] = await iteratee(obj[prop])
		}
		
	}
	
	return obj
}

const walkArray = async (arr, iteratee, ignoreKeys = [], tags = false) => {
	arr.forEach( async (item, idx, a) => {
		if ( typeof item.then === 'function' ) {
			return
		}
		
		if ( Array.isArray(item) ) {
			a[idx] = await walkArray(item, iteratee, ignoreKeys)
		} else if ( isObject(item) ) {
			a[idx] = await walkObject(item, iteratee, ignoreKeys)
		} else {
			a[idx] = await iteratee(item)
		}
	})
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
