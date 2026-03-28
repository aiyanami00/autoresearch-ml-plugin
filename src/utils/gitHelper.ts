// Git operations for auto-commit of experiments
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';

export class GitHelper {
  private git: SimpleGit;
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
    this.git = simpleGit(baseDir);
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--is-inside-work-tree']);
      return true;
    } catch (e) {
      return false;
    }
  }

  async autoCommitExperiment(experimentDir: string, message: string): Promise<boolean> {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        console.log('Not a git repository, skipping auto-commit');
        return false;
      }

      // Add all files in the experiment directory
      await this.git.add([path.join(experimentDir, '**')]);

      // Commit
      await this.git.commit(message);
      console.log(`Committed experiment: ${message}`);
      return true;
    } catch (e) {
      console.error('Git auto-commit failed:', e);
      return false;
    }
  }

  async getCurrentHash(): Promise<string> {
    try {
      return await this.git.revparse(['HEAD']);
    } catch (e) {
      return '';
    }
  }
}
