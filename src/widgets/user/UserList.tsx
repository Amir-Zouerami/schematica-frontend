import { useAdminUsers } from '@/entities/User/api/useUsersAdmin';
import type { components } from '@/shared/types/api-types';
import { Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import DeleteUser from '@/features/user/delete-user/DeleteUser';
import EditUser from '@/features/user/edit-user/EditUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from '@/shared/ui/pagination';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type TeamDto = components['schemas']['TeamDto'];

const UserList = () => {
	const [page, setPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
			setPage(1);
		}, 500);
		return () => clearTimeout(handler);
	}, [searchTerm]);

	const {
		data: usersResponse,
		isLoading: isLoadingUsers,
		error: usersError,
	} = useAdminUsers(page, 10, debouncedSearchTerm);

	const users = usersResponse?.data || [];
	const meta = usersResponse?.meta;

	if (usersError) {
		return <p className="text-destructive">Failed to load users: {usersError.message}</p>;
	}

	return (
		<>
			<div className="relative">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search by username..."
					value={searchTerm}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setSearchTerm(e.target.value)
					}
					className="w-full rounded-lg bg-background pl-8"
				/>
			</div>

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="min-w-[200px]">User</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Teams</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{isLoadingUsers ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={4}>
										<Skeleton className="h-10 w-full" />
									</TableCell>
								</TableRow>
							))
						) : users.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="h-24 text-center">
									No users found.
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium flex items-center gap-2 whitespace-nowrap">
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={
													typeof user.profileImage === 'string'
														? user.profileImage
														: undefined
												}
												alt={user.username}
											/>

											<AvatarFallback>
												{user.username.substring(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										{user.username}
									</TableCell>

									<TableCell className="capitalize">{user.role}</TableCell>

									<TableCell>
										<div className="flex flex-wrap gap-1 min-w-[100px]">
											{user.teams?.map((team: TeamDto) => (
												<Badge key={team.id} variant="outline">
													{team.name}
												</Badge>
											))}
										</div>
									</TableCell>

									<TableCell className="text-right whitespace-nowrap">
										<EditUser user={user} />
										<DeleteUser user={user} />
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{meta && meta.total > meta.limit && (
				<div className="mt-4 flex items-center justify-end">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href="#"
									size="default"
									onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
										e.preventDefault();
										setPage((old) => Math.max(old - 1, 1));
									}}
									className={page === 1 ? 'pointer-events-none opacity-50' : ''}
								/>
							</PaginationItem>

							<span className="text-sm text-muted-foreground mx-2 whitespace-nowrap">
								Page {meta.page} of {meta.lastPage}
							</span>

							<PaginationItem>
								<PaginationNext
									href="#"
									size="default"
									onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
										e.preventDefault();
										if (page < meta.lastPage) {
											setPage((old) => old + 1);
										}
									}}
									className={
										page === meta.lastPage
											? 'pointer-events-none opacity-50'
											: ''
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</>
	);
};

export default UserList;
