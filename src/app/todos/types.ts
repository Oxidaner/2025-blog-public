export type TodoItem = {
	id: string
	text: string
	done: boolean
	createdAt: string
	updatedAt?: string
}

export type TodoMap = Record<string, TodoItem[]>
