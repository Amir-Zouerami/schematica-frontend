import AuditTrail from '@/components/admin/AuditTrail';
import TeamManagement from '@/components/admin/TeamManagement';
import UserManagement from '@/components/admin/UserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminPage = () => {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gradient py-5">Admin Panel</h1>
				<p className="text-muted-foreground">Manage users and teams across the platform.</p>
			</div>
			<Tabs defaultValue="users" className="space-y-4">
				<TabsList>
					<TabsTrigger value="users">Manage Users</TabsTrigger>
					<TabsTrigger value="teams">Manage Teams</TabsTrigger>
					<TabsTrigger value="audit">Audit Trail</TabsTrigger>
				</TabsList>

				<TabsContent value="users">
					<UserManagement />
				</TabsContent>

				<TabsContent value="teams">
					<TeamManagement />
				</TabsContent>

				<TabsContent value="audit">
					<AuditTrail />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default AdminPage;
