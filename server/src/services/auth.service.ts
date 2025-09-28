import User, { IUser } from '../models/auth.model';

export const findOrCreateUser = async (profile: any, accessToken: string): Promise<IUser> => {
    console.log("Profile", profile)

    const existingUser = await User.findOne({ githubId: profile.id });

    if (existingUser) {
        existingUser.accessToken = accessToken;
        existingUser.updatedAt = new Date();
        return existingUser.save();
    }

    const newUser = new User({
        githubId: profile.id,
        username: profile.username,
        accessToken,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
        avatarUrl: profile.photos[0].value,
    });

    return newUser.save();
};
