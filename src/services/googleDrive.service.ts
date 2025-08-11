import { google } from "googleapis";
import path from "path";
import fs from "fs";

export class GoogleDriveService {
  private driveClient: any;

  constructor(
    credentialsPath: string,
    private parentFolderId: string,
  ) {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    this.driveClient = google.drive({ version: "v3", auth });
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
      ".csv": "text/csv",
      ".pdf": "application/pdf",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  async ensureSubfolder(name: string): Promise<string> {
    // Buscar si ya existe una carpeta con ese nombre dentro del folder principal
    const res = await this.driveClient.files.list({
      q: `'${this.parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and trashed = false`,
      fields: "files(id, name)",
    });

    if (res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Si no existe, crearla
    const fileMetadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [this.parentFolderId],
    };

    const folder = await this.driveClient.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    return folder.data.id;
  }

  async uploadFileToSubfolder(
    localFilePath: string,
    fileName: string,
    folderId: string,
  ): Promise<string> {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: this.getMimeType(fileName),
      body: fs.createReadStream(localFilePath),
    };

    const file = await this.driveClient.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id",
    });

    const fileId = file.data.id;

    await this.driveClient.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const result = await this.driveClient.files.get({
      fileId,
      fields: "webViewLink",
    });

    return result.data.webViewLink;
  }

  /**
   * Busca y elimina una subcarpeta por su nombre dentro de la carpeta principal.
   * Si la carpeta no se encuentra, no hace nada.
   * @param folderName - El nombre de la carpeta a eliminar.
   */
  async deleteFolderByName(folderName: string): Promise<void> {
    try {
      const res = await this.driveClient.files.list({
        q: `'${this.parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
        fields: "files(id)",
      });

      if (res.data.files.length === 0) {
        console.log(`[Google Drive] Folder '${folderName}' not found to delete. Skipping this step.`);
        return;
      }

      const folderId = res.data.files[0].id;

      await this.driveClient.files.delete({
        fileId: folderId,
      });

      console.log(`[Google Drive] La carpeta '${folderName}' (ID: ${folderId}) y todo su contenido han sido eliminados correctamente.`);

    } catch (error) {
      console.error(`[Google Drive] Error al intentar eliminar la carpeta '${folderName}':`, error);
      // throw new Error(`Failed to delete Drive folder: ${error.message}`);
    }
  }
}
