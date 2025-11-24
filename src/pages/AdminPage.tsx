import CreateTeam from '@/features/team/create-team/CreateTeam';
import CreateUser from '@/features/user/create-user/CreateUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import AuditTrail from '@/widgets/audit/AuditTrail';
import TeamList from '@/widgets/team/TeamList';
import UserList from '@/widgets/user/UserList';

const AdminPage = () => {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gradient py-5">Admin Panel</h1>

				<p className="text-muted-foreground">
					Manage users, teams, and system-wide settings across the platform.
				</p>
			</div>

			<Tabs defaultValue="users" className="space-y-4">
				<div className="w-full overflow-x-auto pb-1 no-scrollbar">
					<TabsList className="inline-flex w-auto justify-start">
						<TabsTrigger value="users" className="whitespace-nowrap">
							Manage Users
						</TabsTrigger>

						<TabsTrigger value="teams" className="whitespace-nowrap">
							Manage Teams
						</TabsTrigger>

						<TabsTrigger value="audit" className="whitespace-nowrap">
							Audit Trail
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="users">
					<Card>
						<CardHeader>
							<CardTitle className="flex justify-between items-center">
								Users
								<CreateUser />
							</CardTitle>
						</CardHeader>

						<CardContent className="space-y-4">
							<UserList />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="teams">
					<Card>
						<CardHeader>
							<CardTitle className="flex justify-between items-center">
								Teams
								<CreateTeam />
							</CardTitle>
						</CardHeader>

						<CardContent className="space-y-4">
							<TeamList />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="audit">
					<AuditTrail />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default AdminPage;
