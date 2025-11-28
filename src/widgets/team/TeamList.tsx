import { useTeams } from '@/entities/Team/api/useTeams';
import { ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import DeleteTeam from '@/features/team/delete-team/DeleteTeam';
import EditTeam from '@/features/team/edit-team/EditTeam';
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

const TeamList = () => {
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

	const { data: response, isLoading, error } = useTeams(page, 10, debouncedSearchTerm);
	const teams = response?.data || [];
	const meta = response?.meta;

	if (error) {
		return (
			<p className="text-destructive">
				Failed to load teams: {error instanceof ApiError ? error.message : error.message}
			</p>
		);
	}

	return (
		<>
			<div className="relative">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search by team name..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full rounded-lg bg-background pl-8"
				/>
			</div>

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="min-w-[200px]">Team Name</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={2}>
										<Skeleton className="h-10 w-full" />
									</TableCell>
								</TableRow>
							))
						) : teams.length === 0 ? (
							<TableRow>
								<TableCell colSpan={2} className="h-24 text-center">
									No teams found.
								</TableCell>
							</TableRow>
						) : (
							teams.map((team) => (
								<TableRow key={team.id}>
									<TableCell className="font-medium whitespace-nowrap">
										{team.name}
									</TableCell>
									<TableCell className="text-right whitespace-nowrap">
										<EditTeam team={team} />
										<DeleteTeam team={team} />
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

export default TeamList;
