import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Key, LogOut, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AppHeader = () => {
	const { user, logout, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

	const handleLogout = () => {
		logout();
		navigate('/login', { replace: true });
	};

	return (
		<>
			<header className="border-b border-border py-4">
				<div className="container mx-auto px-4 flex justify-between items-center">
					<Link to="/" className="flex items-center space-x-2">
						<h1 className="text-gradient-warm-sunset text-2xl font-bold">{import.meta.env.VITE_BRAND_NAME} API Docs</h1>
					</Link>

					{isAuthenticated && user && (
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-2">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<div className="flex gap-3 hover:cursor-pointer items-center">
											<Avatar className="h-8 w-8">
												<AvatarImage src={user.profileImage} alt={user.username} />
												<AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
											</Avatar>

											<div className="text-sm hidden sm:block">
												<p className="font-medium">{user.username}</p>
												<p className="text-xs text-muted-foreground capitalize">{user.role}</p>
											</div>
										</div>
									</DropdownMenuTrigger>

									<DropdownMenuContent className="w-56" align="end" forceMount>
										<div className="flex items-center justify-start gap-2 p-2">
											<Avatar className="h-10 w-10">
												<AvatarImage src={user.profileImage} alt={user.username} />
												<AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
											</Avatar>

											<div className="flex flex-col space-y-2 leading-none">
												<p className="font-medium">{user.username}</p>
												<p className="text-xs text-muted-foreground capitalize">Team: {user.teams.join(', ')}</p>
											</div>
										</div>

										<DropdownMenuSeparator />

										{user.role === 'admin' && (
											<DropdownMenuItem asChild>
												<Link to="/admin">
													<Shield className="mr-2 h-4 w-4" />
													Admin Panel
												</Link>
											</DropdownMenuItem>
										)}

										<DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
											<Key className="mr-2 h-4 w-4" />
											Change Password
										</DropdownMenuItem>

										<DropdownMenuSeparator />

										<DropdownMenuItem onClick={handleLogout}>
											<LogOut className="mr-2 h-4 w-4" />
											Logout
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					)}
				</div>
			</header>
			<ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
		</>
	);
};

export default AppHeader;
