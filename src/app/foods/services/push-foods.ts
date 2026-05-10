import { createBlob, createCommit, createTree, getRef, toBase64Utf8, updateRef, type TreeItem } from '@/lib/github-client'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { toast } from 'sonner'
import type { FoodCollection } from '../types'

export type PushFoodsParams = {
	foods: FoodCollection
}

export async function pushFoods(params: PushFoodsParams): Promise<void> {
	const { foods } = params
	const token = await getAuthToken()

	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	toast.info('正在准备文件...')
	const foodsJson = JSON.stringify(foods, null, '\t')
	const foodsBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(foodsJson), 'base64')
	const treeItems: TreeItem[] = [
		{
			path: 'src/app/foods/list.json',
			mode: '100644',
			type: 'blob',
			sha: foodsBlob.sha
		}
	]

	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, '更新美食饭店推荐', treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success('发布成功！')
}
