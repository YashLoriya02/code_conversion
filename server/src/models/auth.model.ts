import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
    _id: Types.ObjectId,
    githubId: string;
    username: string;
    displayName: string;
    profileUrl?: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    accessToken: string;
}

const UserSchema: Schema = new Schema({
    githubId: {
        type: String,
        required: true,
        unique: true
    },
    accessToken: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    displayName: {
        type: String
    },
    profileUrl: {
        type: String
    },
    avatarUrl: {
        type: String
    },
}, {
    timestamps: true,
});

export default mongoose.model<IUser>('User', UserSchema);
