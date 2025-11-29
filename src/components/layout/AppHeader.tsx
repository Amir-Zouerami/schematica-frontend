import { useAuth } from '@/app/providers/AuthContext';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
import NotificationBell from '@/components/notifications/NotificationBell';
import UpdateProfilePictureModal from '@/components/profile/UpdateProfilePictureModal';
import { useMe } from '@/entities/User/api/useMe';
import { getStorageUrl } from '@/shared/lib/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { Key, LogOut, Shield, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AppHeader = () => {
	const { logout, isAuthenticated } = useAuth();
	const { data: user } = useMe();
	const navigate = useNavigate();
	const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
	const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] = useState(false);

	const handleLogout = () => {
		logout();
		navigate('/login', { replace: true });
	};

	const teamNamesList = user?.teams?.map((team) => team.name) || [];
	const maxTeams = 2;
	const shouldTruncate = teamNamesList.length > maxTeams;

	const displayedTeams = shouldTruncate
		? `${teamNamesList.slice(0, maxTeams).join(', ')}, +${teamNamesList.length - maxTeams}`
		: teamNamesList.join(', ') || 'No teams';

	const profileImageUrl = getStorageUrl(user?.profileImage);

	return (
		<>
			<header className="border-b border-border py-4">
				<div className="container mx-auto px-4 flex justify-between items-center">
					<Link to="/" className="flex items-center space-x-2">
						<h1 className="text-gradient-mint text-xl md:text-2xl font-bold truncate max-w-[200px] md:max-w-none">
							{import.meta.env.VITE_BRAND_NAME} API Docs
						</h1>
					</Link>

					{isAuthenticated && user && (
						<div className="flex items-center space-x-2 md:space-x-4">
							<div className="flex items-center space-x-2">
								<NotificationBell />

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<div className="flex gap-3 hover:cursor-pointer items-center">
											<Avatar className="h-8 w-8">
												<AvatarImage
													src={profileImageUrl}
													alt={user.username}
												/>
												<AvatarFallback>
													{user.username.substring(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>

											<div className="text-sm hidden sm:block text-left">
												<p className="font-medium">{user.username}</p>
												<p className="text-xs text-muted-foreground capitalize">
													{user.role}
												</p>
											</div>
										</div>
									</DropdownMenuTrigger>

									<DropdownMenuContent className="w-56" align="end" forceMount>
										<div className="flex items-center justify-start gap-2 p-2">
											<Avatar className="h-10 w-10">
												<AvatarImage
													src={profileImageUrl}
													alt={user.username}
												/>
												<AvatarFallback>
													{user.username.substring(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>

											<div className="flex flex-col space-y-1 leading-none overflow-hidden">
												<p className="font-medium">{user.username}</p>
												{shouldTruncate ? (
													<Tooltip>
														<TooltipTrigger asChild>
															<p className="text-xs text-muted-foreground capitalize cursor-help truncate">
																Team: {displayedTeams}
															</p>
														</TooltipTrigger>
														<TooltipContent
															side="left"
															align="start"
															className="max-w-[200px] wrap-break-word"
														>
															<p className="text-xs">
																{teamNamesList.join(', ')}
															</p>
														</TooltipContent>
													</Tooltip>
												) : (
													<p className="text-xs text-muted-foreground capitalize truncate">
														Team: {displayedTeams}
													</p>
												)}
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

										<DropdownMenuItem
											onClick={() => setIsProfilePictureModalOpen(true)}
										>
											<UserCircle className="mr-2 h-4 w-4" />
											Update Profile Picture
										</DropdownMenuItem>

										<DropdownMenuItem
											onClick={() => setIsChangePasswordOpen(true)}
										>
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

			<ChangePasswordModal
				isOpen={isChangePasswordOpen}
				onClose={() => setIsChangePasswordOpen(false)}
			/>

			<UpdateProfilePictureModal
				isOpen={isProfilePictureModalOpen}
				onClose={() => setIsProfilePictureModalOpen(false)}
			/>
		</>
	);
};

export default AppHeader;
